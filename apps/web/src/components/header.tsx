import { Suspense } from "react";
import Link from "next/link";
import { MobileNav } from "@/components/mobile-nav";
import { SearchForm } from "@/components/search-form";
import { ThemeToggle } from "@/components/theme-toggle";
import { siteCopy } from "@/messages/fa";

export function Header() {
  return (
    <header className="border-b bg-background">
      <div className="mx-auto flex w-full max-w-6xl items-center gap-3 px-4 py-3">
        <Link className="text-lg font-bold" href="/">
          {siteCopy.name}
        </Link>
        <nav aria-label={siteCopy.home} className="hidden md:block">
          <Link className="text-sm text-muted-foreground" href="/">
            {siteCopy.home}
          </Link>
        </nav>
        <div className="hidden min-w-0 flex-1 md:block">
          <Suspense fallback={null}>
            <SearchForm />
          </Suspense>
        </div>
        <div className="ms-auto flex items-center gap-2">
          <ThemeToggle />
          <MobileNav />
        </div>
      </div>
      <div className="mx-auto w-full max-w-6xl px-4 pb-3 md:hidden">
        <Suspense fallback={null}>
          <SearchForm />
        </Suspense>
      </div>
    </header>
  );
}
