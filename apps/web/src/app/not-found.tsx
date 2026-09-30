import Link from "next/link";
import { Button } from "@ecom/ui/components/button";
import { EmptyState } from "@ecom/ui/components/empty-state";
import { StoreShell } from "@/components/store-shell";
import { siteCopy } from "@/messages/fa";

export default function NotFound() {
  return (
    <StoreShell>
      <EmptyState
        action={<Button nativeButton={false} render={<Link href="/" />}>{siteCopy.backHome}</Button>}
        description={siteCopy.notFoundBody}
        heading="h1"
        title={siteCopy.notFoundTitle}
      />
    </StoreShell>
  );
}
