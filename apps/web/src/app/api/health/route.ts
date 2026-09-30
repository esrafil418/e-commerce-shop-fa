import { NextResponse } from "next/server";
import { logServer } from "@/server/logger";

export async function GET() {
  await logServer("info", "health.ok");

  return NextResponse.json({ ok: true });
}
