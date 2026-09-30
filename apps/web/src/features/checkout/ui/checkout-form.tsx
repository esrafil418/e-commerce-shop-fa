"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@ecom/ui/components/button";
import { Input } from "@ecom/ui/components/input";
import { Label } from "@ecom/ui/components/label";
import { Price } from "@ecom/ui/components/price";
import { authCopy } from "@/features/auth/messages";
import { storeCopy } from "@/messages/fa";

export function CheckoutForm({
  signedIn,
  methods,
}: {
  signedIn: boolean;
  methods: { code: string; name: string; priceRial: number }[];
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [idempotencyKey] = useState(() => crypto.randomUUID());

  return (
    <form
      className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]"
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        const body = Object.fromEntries(form.entries());
        setPending(true);
        setMessage(null);
        void fetch("/api/checkout", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ ...body, idempotencyKey }),
        })
          .then(async (response) => {
            const result = (await response.json()) as {
              ok?: boolean;
              message?: string;
              orderId?: string;
            };
            if (result.ok && result.orderId) {
              router.push(`/orders/${result.orderId}`);
              return;
            }
            setMessage(result.message ?? storeCopy.checkoutUnavailable);
          })
          .catch(() => setMessage(storeCopy.actionFailed))
          .finally(() => setPending(false));
      }}
    >
      <div className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">{storeCopy.addresses}</h2>
        {!signedIn ? (
          <Field label={storeCopy.guestEmail} name="guestEmail" type="email" />
        ) : null}
        <Field label={storeCopy.recipient} name="recipientName" />
        <Field label={authCopy.phone} name="phone" />
        <Field label={storeCopy.province} name="province" />
        <Field label={storeCopy.city} name="city" />
        <Field label={storeCopy.line1} name="line1" />
        <Field label={storeCopy.postalCode} name="postalCode" inputMode="numeric" />
        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-medium">{storeCopy.shipping}</legend>
          {methods.length === 0 ? (
            <p className="text-sm text-muted-foreground">{storeCopy.shippingEmpty}</p>
          ) : (
            methods.map((method) => (
              <label className="flex items-center justify-between gap-3 text-sm" key={method.code}>
                <span className="flex items-center gap-2">
                  <input name="shippingMethodCode" required type="radio" value={method.code} />
                  {method.name}
                </span>
                <Price amountRial={method.priceRial} />
              </label>
            ))
          )}
        </fieldset>
        <Field label={storeCopy.coupon} name="couponCode" />
        <p className="text-sm text-muted-foreground">{storeCopy.couponHint}</p>
      </div>
      <aside className="flex h-fit flex-col gap-3 rounded-xl border p-4">
        <h2 className="font-semibold">{storeCopy.checkout}</h2>
        <p className="text-sm text-muted-foreground">{storeCopy.cartQuotePending}</p>
        {message ? (
          <p role="status" className="text-sm">
            {message}
          </p>
        ) : null}
        <Button disabled={pending} type="submit">
          {pending ? storeCopy.adding : storeCopy.placeOrder}
        </Button>
      </aside>
    </form>
  );
}

function Field({
  label,
  name,
  type = "text",
  inputMode,
}: {
  label: string;
  name: string;
  type?: string;
  inputMode?: "numeric" | "text";
}) {
  const id = `checkout-${name}`;
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} inputMode={inputMode} name={name} type={type} />
    </div>
  );
}
