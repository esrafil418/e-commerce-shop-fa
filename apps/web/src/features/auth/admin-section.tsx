import type { ReactNode } from "react";
import { forbidden, redirect } from "next/navigation";
import { decideAdminSection } from "./access";
import { getCurrentActor } from "@/lib/auth/current-user";

export async function AdminSection({
  title,
  allowed,
  children,
}: {
  title: string;
  allowed: boolean;
  children?: ReactNode;
}) {
  const actor = await getCurrentActor();
  const decision = decideAdminSection(actor, allowed);
  if (decision.kind === "redirect") {
    redirect(decision.location);
  }
  if (decision.kind === "forbidden") {
    forbidden();
  }

  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">{title}</h1>
      {children}
    </section>
  );
}
