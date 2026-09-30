import type { Metadata } from "next";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { StoreShell } from "@/components/store-shell";
import { decideAccountAccess } from "@/features/auth/access";
import { getCurrentActor } from "@/lib/auth/current-user";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function AccountLayout({
  children,
}: {
  children: ReactNode;
}) {
  const actor = await getCurrentActor();
  const decision = decideAccountAccess(actor, "/account");
  if (decision.kind === "redirect") {
    redirect(decision.location);
  }

  return <StoreShell>{children}</StoreShell>;
}
