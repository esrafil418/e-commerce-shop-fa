import { Suspense } from "react";
import Link from "next/link";
import { MobileNav } from "@/components/mobile-nav";
import { SearchForm } from "@/components/search-form";
import { ThemeToggle } from "@/components/theme-toggle";
import { authCopy } from "@/features/auth/messages";
import { isStaff } from "@/features/auth/permissions";
import { getCurrentActor } from "@/lib/auth/current-user";
import { siteCopy } from "@/messages/fa";

export async function Header() {
  const actor = await getCurrentActor();

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
          {actor ? (
            <Link className="text-sm" href="/account">
              {authCopy.goToAccount}
            </Link>
          ) : (
            <Link className="text-sm" href="/auth/login">
              {authCopy.goToLogin}
            </Link>
          )}
          {actor && isStaff(actor) ? (
            <Link className="hidden text-sm md:inline" href="/admin">
              {authCopy.goToAdmin}
            </Link>
          ) : null}
          <ThemeToggle />
          <MobileNav signedIn={Boolean(actor)} staff={Boolean(actor && isStaff(actor))} />
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
