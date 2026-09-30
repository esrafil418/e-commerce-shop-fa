import { NextResponse } from "next/server";
import { trackOrderSchema } from "@ecom/validation";
import { trackOrder } from "@/features/orders/server";
import { storeCopy } from "@/messages/fa";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = trackOrderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: storeCopy.trackMiss }, { status: 400 });
  }
  const order = await trackOrder(parsed.data.number, parsed.data.email);
  if (!order) {
    return NextResponse.json({ message: storeCopy.trackMiss }, { status: 404 });
  }
  const response = NextResponse.json(order);
  response.cookies.set("tracked_order", order.id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/orders",
    maxAge: 60 * 30,
  });
  return response;
}
