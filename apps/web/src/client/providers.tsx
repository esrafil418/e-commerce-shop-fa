"use client";

import { NuqsAdapter } from "nuqs/adapters/next/app";
import { ThemeProvider } from "next-themes";
import type { ReactNode } from "react";
import { QueryProvider } from "@/client/query-provider";
import { Toaster } from "@ecom/ui/components/sonner";
import { TooltipProvider } from "@ecom/ui/components/tooltip";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      disableTransitionOnChange
      enableSystem
    >
      <NuqsAdapter>
        <QueryProvider>
          <TooltipProvider>
            {children}
            <Toaster dir="rtl" position="top-center" />
          </TooltipProvider>
        </QueryProvider>
      </NuqsAdapter>
    </ThemeProvider>
  );
}
