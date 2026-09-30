"use client";

import { Button } from "@ecom/ui/components/button";
import { ErrorState } from "@ecom/ui/components/error-state";
import { siteCopy } from "@/messages/fa";

export default function StoreError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorState
      action={
        <Button onClick={() => reset()} type="button">
          {siteCopy.retry}
        </Button>
      }
      description={siteCopy.errorBody}
      title={siteCopy.errorTitle}
    />
  );
}
