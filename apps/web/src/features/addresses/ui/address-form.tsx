"use client";

import { useActionState } from "react";
import { Button } from "@ecom/ui/components/button";
import { Input } from "@ecom/ui/components/input";
import { Label } from "@ecom/ui/components/label";
import { saveAddressAction } from "../actions";
import { authCopy } from "@/features/auth/messages";
import { storeCopy } from "@/messages/fa";

export function AddressForm() {
  const [state, action, pending] = useActionState(saveAddressAction, {
    status: "idle" as const,
    message: null as string | null,
  });

  return (
    <form action={action} className="grid gap-3">
      <h2 className="text-lg font-medium">{storeCopy.saveAddress}</h2>
      <Field label={storeCopy.addressLabel} name="label" />
      <Field label={storeCopy.recipient} name="recipientName" />
      <Field label={authCopy.phone} name="phone" />
      <Field label={storeCopy.province} name="province" />
      <Field label={storeCopy.city} name="city" />
      <Field label={storeCopy.line1} name="line1" />
      <Field label={storeCopy.postalCode} name="postalCode" />
      <label className="flex items-center gap-2 text-sm">
        <input name="isDefault" type="checkbox" value="1" />
        {storeCopy.defaultAddress}
      </label>
      {state.message ? <p role="status">{state.message}</p> : null}
      <Button disabled={pending} type="submit">
        {storeCopy.saveAddress}
      </Button>
    </form>
  );
}

function Field({ label, name }: { label: string; name: string }) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} />
    </div>
  );
}
