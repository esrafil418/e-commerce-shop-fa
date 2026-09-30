import "server-only";

import type { AddressInput } from "@ecom/validation";
import { addressSchema } from "@ecom/validation";
import { parseTrusted } from "@/features/auth/access";
import { getCurrentActor } from "@/lib/auth/current-user";
import { authCopy } from "@/features/auth/messages";
import { storeCopy } from "@/messages/fa";
import {
  bool,
  getDb,
  missingRelation,
  mutate,
  query,
  readRows,
  str,
} from "@/features/catalog/data/db";

export type AddressRecord = AddressInput & { id: string };

export async function listAddresses(): Promise<
  { status: "ready"; addresses: AddressRecord[] } | { status: "unavailable" }
> {
  const actor = await getCurrentActor();
  if (!actor) return { status: "ready", addresses: [] };
  const db = await getDb();
  if (!db) return { status: "unavailable" };
  const rows = await readRows(
    query(
      db,
      "addresses",
      "id, label, recipient_name, phone, province, city, line1, postal_code, is_default",
    ).eq("user_id", actor.userId),
  );
  if (rows === "missing") return { status: "unavailable" };
  return {
    status: "ready",
    addresses: rows.map((row) => ({
      id: str(row, "id"),
      label: str(row, "label"),
      recipientName: str(row, "recipient_name"),
      phone: str(row, "phone"),
      province: str(row, "province"),
      city: str(row, "city"),
      line1: str(row, "line1"),
      postalCode: str(row, "postal_code"),
      isDefault: bool(row, "is_default"),
    })),
  };
}

export async function saveAddress(
  raw: Record<string, unknown>,
): Promise<{ ok: boolean; message: string }> {
  const actor = await getCurrentActor();
  if (!actor) return { ok: false, message: authCopy.unauthenticated };
  const parsed = parseTrusted(addressSchema, raw);
  if (!parsed.ok) return { ok: false, message: parsed.error.message };
  const db = await getDb();
  if (!db) return { ok: false, message: storeCopy.addressesUnavailable };

  if (parsed.data.isDefault) {
    const cleared = await mutate(db, "addresses")
      .update({ is_default: false })
      .eq("user_id", actor.userId);
    if (cleared.error && missingRelation(cleared.error)) {
      return { ok: false, message: storeCopy.addressesUnavailable };
    }
  }

  const inserted = await mutate(db, "addresses").insert({
    user_id: actor.userId,
    label: parsed.data.label,
    recipient_name: parsed.data.recipientName,
    phone: parsed.data.phone,
    province: parsed.data.province,
    city: parsed.data.city,
    line1: parsed.data.line1,
    postal_code: parsed.data.postalCode,
    is_default: parsed.data.isDefault,
  });

  if (inserted.error) {
    return {
      ok: false,
      message: missingRelation(inserted.error)
        ? storeCopy.addressesUnavailable
        : storeCopy.actionFailed,
    };
  }
  return { ok: true, message: storeCopy.saved };
}
