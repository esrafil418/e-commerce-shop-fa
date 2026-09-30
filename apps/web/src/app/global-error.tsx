"use client";

import { Vazirmatn } from "next/font/google";
import { Button } from "@ecom/ui/components/button";
import { ErrorState } from "@ecom/ui/components/error-state";
import { siteCopy } from "@/messages/fa";

const vazirmatn = Vazirmatn({
  subsets: ["arabic", "latin"],
  display: "swap",
});

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html className={vazirmatn.className} dir="rtl" lang="fa">
      <body className="mx-auto flex min-h-full max-w-6xl items-center px-4 py-16">
        <ErrorState
          action={
            <Button onClick={() => reset()} type="button">
              {siteCopy.retry}
            </Button>
          }
          description={siteCopy.errorBody}
          title={siteCopy.errorTitle}
        />
      </body>
    </html>
  );
}
