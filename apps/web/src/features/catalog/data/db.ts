import "server-only";

import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logServer } from "@/server/logger";

export type Db = Awaited<ReturnType<typeof createSupabaseServerClient>>;

type QueryError = { code?: string; message?: string };
type QueryResult = { data: unknown; error: QueryError | null };

export interface Query extends PromiseLike<QueryResult> {
  eq(column: string, value: string | number | boolean | null): Query;
  in(column: string, values: readonly string[]): Query;
  ilike(column: string, pattern: string): Query;
  order(column: string, options: { ascending: boolean }): Query;
  limit(count: number): Query;
  maybeSingle(): Promise<QueryResult>;
}

export interface Mutation extends PromiseLike<QueryResult> {
  insert(values: Record<string, unknown> | Record<string, unknown>[]): Mutation;
  update(values: Record<string, unknown>): Mutation;
  delete(): Mutation;
  select(columns: string): Mutation;
  eq(column: string, value: string | number | boolean | null): Mutation;
  in(column: string, values: readonly string[]): Mutation;
  order(column: string, options: { ascending: boolean }): Mutation;
  limit(count: number): Mutation;
  single(): Promise<QueryResult>;
  maybeSingle(): Promise<QueryResult>;
}

export async function getDb(): Promise<Db | null> {
  if (!isSupabaseConfigured()) return null;
  return createSupabaseServerClient();
}

export function query(db: Db, table: string, columns: string): Query {
  const from = db.from as unknown as (name: string) => {
    select: (columns: string) => Query;
  };
  return from(table).select(columns);
}

export function mutate(db: Db, table: string): Mutation {
  const from = db.from as unknown as (name: string) => Mutation;
  return from(table);
}

export function missingRelation(error: QueryError | null): boolean {
  if (!error) return false;
  const code = error.code ?? "";
  const message = (error.message ?? "").toLowerCase();
  return (
    code === "42P01" ||
    code === "PGRST204" ||
    code === "PGRST205" ||
    message.includes("does not exist") ||
    message.includes("schema cache") ||
    message.includes("could not find the table")
  );
}

export async function readRows(filter: Query): Promise<Record<string, unknown>[] | "missing"> {
  const { data, error } = await filter;
  if (error) {
    if (missingRelation(error)) return "missing";
    await logServer("error", "catalog.query_failed", {
      code: error.code,
      message: error.message,
    });
    throw new Error("catalog query failed");
  }
  return asRows(data);
}

export async function readMaybe(
  filter: Promise<QueryResult>,
): Promise<Record<string, unknown> | null | "missing"> {
  const { data, error } = await filter;
  if (error) {
    if (missingRelation(error)) return "missing";
    await logServer("error", "catalog.query_failed", {
      code: error.code,
      message: error.message,
    });
    throw new Error("catalog query failed");
  }
  if (!data || typeof data !== "object" || Array.isArray(data)) return null;
  return data as Record<string, unknown>;
}

export function asRows(data: unknown): Record<string, unknown>[] {
  if (!Array.isArray(data)) return [];
  return data.filter(
    (row): row is Record<string, unknown> =>
      row !== null && typeof row === "object" && !Array.isArray(row),
  );
}

export function str(row: Record<string, unknown>, key: string): string {
  const value = row[key];
  return typeof value === "string" ? value : "";
}

export function num(row: Record<string, unknown>, key: string): number | null {
  const value = row[key];
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) {
    return Number(value);
  }
  return null;
}

export function bool(row: Record<string, unknown>, key: string): boolean {
  return row[key] === true;
}
