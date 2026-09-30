"use client";

import { create } from "zustand";

type ShellUiState = {
  mobileNavOpen: boolean;
  cartDrawerOpen: boolean;
  openMobileNav: () => void;
  closeMobileNav: () => void;
  setMobileNavOpen: (open: boolean) => void;
  openCartDrawer: () => void;
  closeCartDrawer: () => void;
};

export const useShellUi = create<ShellUiState>((set) => ({
  mobileNavOpen: false,
  cartDrawerOpen: false,
  openMobileNav: () => set({ mobileNavOpen: true }),
  closeMobileNav: () => set({ mobileNavOpen: false }),
  setMobileNavOpen: (mobileNavOpen) => set({ mobileNavOpen }),
  openCartDrawer: () => set({ cartDrawerOpen: true }),
  closeCartDrawer: () => set({ cartDrawerOpen: false }),
}));
