"use server";

import { revalidatePath } from "next/cache";
import { saveAddress } from "./server";

export async function saveAddressAction(
  _state: { status: "idle" | "error" | "success"; message: string | null },
  formData: FormData,
): Promise<{ status: "idle" | "error" | "success"; message: string | null }> {
  const result = await saveAddress({
    label: formData.get("label"),
    recipientName: formData.get("recipientName"),
    phone: formData.get("phone"),
    province: formData.get("province"),
    city: formData.get("city"),
    line1: formData.get("line1"),
    postalCode: formData.get("postalCode"),
    isDefault: formData.get("isDefault") === "1",
  });
  if (result.ok) revalidatePath("/profile/addresses");
  return { status: result.ok ? "success" as const : "error" as const, message: result.message };
}
