import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { siteCopy } from "@/messages/fa";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main
      className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-10"
      id="main"
    >
      <Link className="mb-6 text-sm text-muted-foreground" href="/">
        {siteCopy.name}
      </Link>
      {children}
    </main>
  );
}
