"use client";

import Link from "next/link";
import { MenuIcon } from "lucide-react";
import { Button } from "@ecom/ui/components/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@ecom/ui/components/sheet";
import { useShellUi } from "@/hooks/use-shell-ui";
import { siteCopy } from "@/messages/fa";

export function MobileNav() {
  const open = useShellUi((state) => state.mobileNavOpen);
  const setOpen = useShellUi((state) => state.setMobileNavOpen);

  return (
    <Sheet onOpenChange={setOpen} open={open}>
      <Button
        aria-expanded={open}
        aria-label={open ? siteCopy.closeMenu : siteCopy.openMenu}
        className="md:hidden"
        onClick={() => setOpen(true)}
        size="icon"
        type="button"
        variant="outline"
      >
        <MenuIcon />
      </Button>
      <SheetContent className="md:hidden" side="right">
        <SheetHeader>
          <SheetTitle>{siteCopy.menuTitle}</SheetTitle>
        </SheetHeader>
        <nav aria-label={siteCopy.menuTitle}>
          <Link className="text-sm font-medium" href="/" onClick={() => setOpen(false)}>
            {siteCopy.home}
          </Link>
        </nav>
      </SheetContent>
    </Sheet>
  );
}
