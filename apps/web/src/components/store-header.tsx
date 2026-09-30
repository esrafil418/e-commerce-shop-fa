"use client";

import { useState } from "react";
import Link from "next/link";
import { MenuIcon, SearchIcon, ShoppingBagIcon, UserIcon, HeartIcon } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { Button } from "@ecom/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@ecom/ui/components/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@ecom/ui/components/sheet";
import { ThemeToggle } from "@/components/theme-toggle";
import { CartDrawer } from "@/features/cart/ui/cart-drawer";
import { SearchBox } from "@/features/search/ui/search-box";
import { logoutAction } from "@/features/auth/actions";
import { authCopy } from "@/features/auth/messages";
import { useShellUi } from "@/hooks/use-shell-ui";
import { siteCopy, storeCopy } from "@/messages/fa";
import type { CartSnapshot } from "@/features/cart/types";

const container = "mx-auto flex w-full max-w-7xl items-center gap-2 px-4";

const links = [
  { href: "/", label: siteCopy.home },
  { href: "/products", label: storeCopy.products },
  { href: "/categories", label: storeCopy.categories },
];

export function StoreHeader({
  signedIn,
  staff,
  email,
  cart,
}: {
  signedIn: boolean;
  staff: boolean;
  email: string | null;
  cart: CartSnapshot;
}) {
  const reducedMotion = useReducedMotion();
  const menuOpen = useShellUi((state) => state.mobileNavOpen);
  const setMenuOpen = useShellUi((state) => state.setMobileNavOpen);
  const openCart = useShellUi((state) => state.openCartDrawer);
  const [searchSheet, setSearchSheet] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
      <div className={`${container} py-3`}>
        <Button
          aria-expanded={menuOpen}
          aria-label={menuOpen ? siteCopy.closeMenu : siteCopy.openMenu}
          className="md:hidden"
          onClick={() => setMenuOpen(true)}
          size="icon"
          type="button"
          variant="outline"
        >
          <MenuIcon />
        </Button>
        <Link className="text-lg font-bold" href="/">
          {siteCopy.name}
        </Link>
        <nav aria-label={siteCopy.home} className="ms-4 hidden items-center gap-4 lg:flex">
          {links.map((link) => (
            <Link className="text-sm focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring" href={link.href} key={link.href}>
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="hidden min-w-0 flex-1 md:block">
          <SearchBox idPrefix="desktop" />
        </div>
        <div className="ms-auto flex items-center gap-1">
          <Button
            aria-label={storeCopy.openSearch}
            className="md:hidden"
            onClick={() => setSearchSheet(true)}
            size="icon"
            type="button"
            variant="outline"
          >
            <SearchIcon />
          </Button>
          <AccountMenu email={email} signedIn={signedIn} staff={staff} />
          <Button nativeButton={false} render={<Link href="/wishlist" />} size="icon" variant="outline" aria-label={storeCopy.wishlist}>
            <HeartIcon />
          </Button>
          <Button
            aria-label={`${storeCopy.openCart}، ${new Intl.NumberFormat("fa-IR").format(cart.itemCount)}`}
            className="relative"
            onClick={openCart}
            size="icon"
            type="button"
            variant="outline"
          >
            <ShoppingBagIcon />
            {cart.itemCount > 0 ? (
              <motion.span
                animate={reducedMotion ? undefined : { scale: [0.9, 1] }}
                className="absolute -top-1 -start-1 grid min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] text-primary-foreground"
                key={cart.itemCount}
              >
                {new Intl.NumberFormat("fa-IR").format(cart.itemCount)}
              </motion.span>
            ) : null}
          </Button>
          <ThemeToggle />
        </div>
      </div>
      <nav aria-label={siteCopy.home} className="hidden border-t md:block lg:hidden">
        <ul className={`${container} gap-4 py-2`}>
          {links.map((link) => (
            <li key={link.href}>
              <Link className="text-sm" href={link.href}>
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <Sheet onOpenChange={setMenuOpen} open={menuOpen}>
        <SheetContent className="md:hidden" side="right">
          <SheetHeader>
            <SheetTitle>{siteCopy.menuTitle}</SheetTitle>
          </SheetHeader>
          <nav aria-label={siteCopy.menuTitle} className="flex flex-col gap-3">
            {links.map((link) => (
              <Link href={link.href} key={link.href} onClick={() => setMenuOpen(false)}>
                {link.label}
              </Link>
            ))}
            <Link href={signedIn ? "/profile" : "/auth/login"} onClick={() => setMenuOpen(false)}>
              {signedIn ? storeCopy.profile : storeCopy.login}
            </Link>
            {staff ? (
              <Link href="/admin" onClick={() => setMenuOpen(false)}>
                {authCopy.goToAdmin}
              </Link>
            ) : null}
          </nav>
        </SheetContent>
      </Sheet>
      <Sheet onOpenChange={setSearchSheet} open={searchSheet}>
        <SheetContent className="md:hidden" side="top">
          <SheetHeader>
            <SheetTitle>{storeCopy.searchMobile}</SheetTitle>
          </SheetHeader>
          <SearchBox autoFocus idPrefix="mobile" onNavigate={() => setSearchSheet(false)} />
        </SheetContent>
      </Sheet>
      <CartDrawer cart={cart} />
    </header>
  );
}

function AccountMenu({
  signedIn,
  staff,
  email,
}: {
  signedIn: boolean;
  staff: boolean;
  email: string | null;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={storeCopy.accountMenu}
        render={<Button size="icon" variant="outline" />}
      >
        <UserIcon />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {email ? <DropdownMenuLabel>{email}</DropdownMenuLabel> : null}
        {signedIn ? (
          <>
            <DropdownMenuItem render={<Link href="/profile" />}>{storeCopy.profile}</DropdownMenuItem>
            <DropdownMenuItem render={<Link href="/profile/orders" />}>{storeCopy.orders}</DropdownMenuItem>
            <DropdownMenuItem render={<Link href="/profile/addresses" />}>{storeCopy.addresses}</DropdownMenuItem>
            <DropdownMenuItem render={<Link href="/profile/wishlist" />}>{storeCopy.wishlist}</DropdownMenuItem>
            <DropdownMenuItem render={<Link href="/profile/settings" />}>{storeCopy.settings}</DropdownMenuItem>
            {staff ? (
              <DropdownMenuItem render={<Link href="/admin" />}>{authCopy.goToAdmin}</DropdownMenuItem>
            ) : null}
            <DropdownMenuSeparator />
            <form action={logoutAction}>
              <button className="w-full px-1.5 py-1 text-start text-sm" type="submit">
                {authCopy.logout}
              </button>
            </form>
          </>
        ) : (
          <>
            <DropdownMenuItem render={<Link href="/auth/login" />}>{storeCopy.login}</DropdownMenuItem>
            <DropdownMenuItem render={<Link href="/auth/register" />}>{storeCopy.register}</DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
