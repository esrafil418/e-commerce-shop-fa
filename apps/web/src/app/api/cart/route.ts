import { NextResponse } from "next/server";
import { addToCart, updateCartItem } from "@/features/cart/server";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    variantId?: string;
    quantity?: number;
  } | null;
  const result = await addToCart({
    variantId: body?.variantId ?? "",
    quantity: body?.quantity ?? 1,
  });
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}

export async function PATCH(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    itemId?: string;
    quantity?: number;
  } | null;
  if (!body?.itemId) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const cart = await updateCartItem(body.itemId, body.quantity ?? 0);
  return NextResponse.json(cart);
}
