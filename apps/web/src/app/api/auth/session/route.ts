import { NextResponse } from "next/server";
import { accountSessionResponse } from "@/features/auth/http";
import { readSessionActor } from "@/lib/auth/session";

export async function GET() {
  const actor = await readSessionActor();
  const result = accountSessionResponse(actor);
  return NextResponse.json(result.body, { status: result.status });
}
