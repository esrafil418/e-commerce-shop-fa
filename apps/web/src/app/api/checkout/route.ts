import { NextResponse } from "next/server";
import { placeOrder } from "@/features/checkout/server";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const result = await placeOrder(body ?? {});
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
