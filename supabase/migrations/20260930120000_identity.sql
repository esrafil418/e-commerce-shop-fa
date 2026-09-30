create extension if not exists pgcrypto;

-- Identity, staff permissions, and the rate-limit counter.
-- A new auth user receives a profile and the customer role only.
-- Role names in raw_user_meta_data are ignored.
-- Keep private.has_permission aligned with
-- apps/web/src/features/auth/permissions.ts.

create schema if not exists private;

revoke all on schema private from public;
grant usage on schema private to authenticated, service_role;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_full_name_length check (full_name is null or char_length(full_name) <= 80),
  constraint profiles_phone_length check (phone is null or char_length(phone) <= 20)
);

create table public.user_roles (
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null,
  primary key (user_id, role),
  constraint user_roles_role_check check (
    role in ('customer', 'support', 'catalog_manager', 'order_manager', 'admin')
  )
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid,
  action text not null,
  entity text not null,
  entity_id uuid,
  diff jsonb,
  created_at timestamptz not null default now()
);

create table public.rate_limit_buckets (
  key text primary key,
  window_start timestamptz not null,
  count integer not null check (count >= 0),
  constraint rate_limit_buckets_key_length check (char_length(key) between 1 and 200)
);

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.audit_logs enable row level security;
alter table public.rate_limit_buckets enable row level security;

create or replace function private.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function private.set_updated_at();

create or replace function private.has_role(uid uuid, requested text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = uid
      and (role = requested or role = 'admin')
  );
$$;

create or replace function private.has_permission(uid uuid, permission text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case permission
    when 'catalog.products.manage' then private.has_role(uid, 'catalog_manager')
    when 'inventory.manage' then private.has_role(uid, 'catalog_manager')
    when 'orders.manage' then private.has_role(uid, 'order_manager')
    when 'orders.read' then
      private.has_role(uid, 'support') or private.has_role(uid, 'order_manager')
    when 'reviews.moderate' then private.has_role(uid, 'support')
    when 'roles.manage' then private.has_role(uid, 'admin')
    else false
  end;
$$;

revoke all on function private.has_role(uuid, text) from public;
revoke all on function private.has_permission(uuid, text) from public;
grant execute on function private.has_role(uuid, text) to authenticated, service_role;
grant execute on function private.has_permission(uuid, text) to authenticated, service_role;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_name text;
begin
  requested_name = nullif(new.raw_user_meta_data ->> 'full_name', '');
  insert into public.profiles (id, full_name)
  values (new.id, requested_name);

  perform set_config('app.role_write', 'grant_role', true);
  insert into public.user_roles (user_id, role)
  values (new.id, 'customer');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

create or replace function private.guard_role_write()
returns trigger
language plpgsql
as $$
begin
  if current_setting('app.role_write', true) is distinct from 'grant_role' then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return coalesce(new, old);
end;
$$;

create trigger user_roles_guard_write
  before insert or delete on public.user_roles
  for each row execute function private.guard_role_write();

create or replace function public.grant_role(target_user_id uuid, target_role text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'unauthenticated' using errcode = '28000';
  end if;
  if not private.has_permission(auth.uid(), 'roles.manage') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if target_role not in ('customer', 'support', 'catalog_manager', 'order_manager', 'admin') then
    raise exception 'invalid role' using errcode = '22023';
  end if;

  perform set_config('app.role_write', 'grant_role', true);
  insert into public.user_roles (user_id, role)
  values (target_user_id, target_role)
  on conflict do nothing;

  insert into public.audit_logs (actor_id, action, entity, entity_id, diff)
  values (
    auth.uid(),
    'role.grant',
    'user_roles',
    target_user_id,
    jsonb_build_object('role', target_role)
  );
end;
$$;

create or replace function public.revoke_role(target_user_id uuid, target_role text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'unauthenticated' using errcode = '28000';
  end if;
  if not private.has_permission(auth.uid(), 'roles.manage') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if target_user_id = auth.uid() and target_role = 'admin' then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  perform set_config('app.role_write', 'grant_role', true);
  delete from public.user_roles
  where user_id = target_user_id
    and role = target_role;

  insert into public.audit_logs (actor_id, action, entity, entity_id, diff)
  values (
    auth.uid(),
    'role.revoke',
    'user_roles',
    target_user_id,
    jsonb_build_object('role', target_role)
  );
end;
$$;

revoke all on function public.grant_role(uuid, text) from public;
revoke all on function public.revoke_role(uuid, text) from public;
grant execute on function public.grant_role(uuid, text) to authenticated;
grant execute on function public.revoke_role(uuid, text) to authenticated;

create or replace function public.consume_rate_limit(
  bucket_key text,
  window_seconds integer,
  max_count integer
)
returns table (
  allowed boolean,
  remaining integer,
  retry_after_seconds integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  existing public.rate_limit_buckets%rowtype;
  bucket_window timestamptz;
  next_count integer;
begin
  if bucket_key is null or char_length(bucket_key) < 1 or char_length(bucket_key) > 200 then
    raise exception 'invalid key' using errcode = '22023';
  end if;
  if window_seconds <= 0 or max_count <= 0 then
    raise exception 'invalid window' using errcode = '22023';
  end if;

  select * into existing
  from public.rate_limit_buckets
  where key = bucket_key
  for update;

  if not found or existing.window_start + make_interval(secs => window_seconds) <= now() then
    bucket_window := now();
    next_count := 1;
    insert into public.rate_limit_buckets as buckets (key, window_start, count)
    values (bucket_key, bucket_window, next_count)
    on conflict (key) do update
      set window_start = excluded.window_start,
          count = excluded.count;
  else
    bucket_window := existing.window_start;
    next_count := existing.count + 1;
    update public.rate_limit_buckets
      set count = next_count
      where key = bucket_key;
  end if;

  allowed := next_count <= max_count;
  remaining := greatest(max_count - next_count, 0);
  retry_after_seconds := greatest(
    ceil(extract(epoch from (bucket_window + make_interval(secs => window_seconds) - now())))::integer,
    0
  );
  return next;
end;
$$;

revoke all on function public.consume_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_rate_limit(text, integer, integer) to service_role;

create policy profiles_select_own
  on public.profiles
  for select
  to authenticated
  using (id = (select auth.uid()));

create policy profiles_update_own
  on public.profiles
  for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy user_roles_select_own
  on public.user_roles
  for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy audit_logs_select_admin
  on public.audit_logs
  for select
  to authenticated
  using (private.has_permission((select auth.uid()), 'roles.manage'));

revoke all on table public.rate_limit_buckets from anon, authenticated;
