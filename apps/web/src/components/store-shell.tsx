import type { ReactNode } from "react";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { PageTransition } from "@/components/page-transition";
import { siteCopy } from "@/messages/fa";

const container = "mx-auto w-full max-w-7xl px-4";

export function StoreShell({ children }: { children: ReactNode }) {
  return (
    <>
      <a
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:m-3 focus:rounded-lg focus:bg-background focus:px-3 focus:py-2 focus:shadow-sm"
        href="#main"
      >
        {siteCopy.skipToContent}
      </a>
      <Header />
      <main className={`${container} flex-1 py-6 md:py-8`} id="main">
        <PageTransition>{children}</PageTransition>
      </main>
      <Footer />
    </>
  );
}
