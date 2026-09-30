import type { ReactNode } from "react";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { siteCopy } from "@/messages/fa";

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
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8" id="main">
        {children}
      </main>
      <Footer />
    </>
  );
}
