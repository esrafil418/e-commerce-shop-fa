import { NextResponse } from "next/server";
import { suggest } from "@/features/catalog/data/catalog-store";

export async function GET(request: Request) {
  const term = new URL(request.url).searchParams.get("q") ?? "";
  const hits = await suggest(term.slice(0, 80));
  return NextResponse.json({ hits });
}
