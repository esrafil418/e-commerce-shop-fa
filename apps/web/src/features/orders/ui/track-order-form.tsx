"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@ecom/ui/components/button";
import { Input } from "@ecom/ui/components/input";
import { Label } from "@ecom/ui/components/label";
import { storeCopy } from "@/messages/fa";

export function TrackOrderForm() {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <form
      className="grid gap-3 rounded-xl border p-4 md:grid-cols-[1fr_1fr_auto]"
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        setPending(true);
        setMessage(null);
        void fetch("/api/orders/track", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            number: form.get("number"),
            email: form.get("email"),
          }),
        })
          .then(async (response) => {
            const body = (await response.json()) as { id?: string; message?: string };
            if (body.id) {
              router.push(`/orders/${body.id}`);
              return;
            }
            setMessage(body.message ?? storeCopy.trackMiss);
          })
          .catch(() => setMessage(storeCopy.actionFailed))
          .finally(() => setPending(false));
      }}
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor="track-number">{storeCopy.orderNumber}</Label>
        <Input id="track-number" name="number" required />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="track-email">{storeCopy.guestEmail}</Label>
        <Input id="track-email" name="email" required type="email" />
      </div>
      <Button className="self-end" disabled={pending} type="submit">
        {storeCopy.trackSubmit}
      </Button>
      {message ? (
        <p className="text-sm md:col-span-3" role="status">
          {message}
        </p>
      ) : null}
    </form>
  );
}
