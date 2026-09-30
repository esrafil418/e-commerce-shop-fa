import { NextResponse } from "next/server";
import { listWishlistIds, toggleWishlist } from "@/features/wishlist/server";

export async function GET() {
  const ids = await listWishlistIds();
  return NextResponse.json({ ids });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { productId?: string } | null;
  if (!body?.productId) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const result = await toggleWishlist(body.productId);
  if (!result.ok && result.code === "unauthenticated") {
    return NextResponse.json(result, { status: 401 });
  }
  if (!result.ok) return NextResponse.json(result, { status: 400 });
  return NextResponse.json(result);
}
