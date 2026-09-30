import type { ReactNode } from "react";
import Link from "next/link";
import { forbidden, redirect } from "next/navigation";
import { decideAdminAccess } from "@/features/auth/access";
import { authCopy } from "@/features/auth/messages";
import {
  canManageInventory,
  canManageOrders,
  canManageProducts,
  canManageRoles,
  canModerateReviews,
  type Actor,
} from "@/features/auth/permissions";
import { getCurrentActor } from "@/lib/auth/current-user";
import { siteCopy } from "@/messages/fa";

const links = [
  {
    href: "/admin/products",
    label: authCopy.adminProducts,
    allow: canManageProducts,
  },
  {
    href: "/admin/orders",
    label: authCopy.adminOrders,
    allow: canManageOrders,
  },
  {
    href: "/admin/reviews",
    label: authCopy.adminReviews,
    allow: canModerateReviews,
  },
  {
    href: "/admin/inventory",
    label: authCopy.adminInventory,
    allow: canManageInventory,
  },
  {
    href: "/admin/roles",
    label: authCopy.adminRoles,
    allow: canManageRoles,
  },
] as const;

function AdminNav({ actor }: { actor: Actor }) {
  return (
    <nav aria-label={authCopy.adminTitle} className="flex w-48 shrink-0 flex-col gap-2">
      <Link className="text-sm font-medium" href="/admin">
        {authCopy.adminTitle}
      </Link>
      {links
        .filter((link) => link.allow(actor))
        .map((link) => (
          <Link className="text-sm text-muted-foreground" href={link.href} key={link.href}>
            {link.label}
          </Link>
        ))}
      <Link className="text-sm text-muted-foreground" href="/">
        {siteCopy.name}
      </Link>
    </nav>
  );
}

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const actor = await getCurrentActor();
  const decision = decideAdminAccess(actor);
  if (decision.kind === "redirect") {
    redirect(decision.location);
  }
  if (decision.kind === "forbidden") {
    forbidden();
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 gap-8 px-4 py-8">
      <AdminNav actor={decision.actor} />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
