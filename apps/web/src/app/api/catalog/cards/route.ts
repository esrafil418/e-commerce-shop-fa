import { NextResponse } from "next/server";
import { loadCardsBySlugs } from "@/features/catalog/data/catalog-store";

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export async function GET(request: Request) {
  const raw = new URL(request.url).searchParams.get("slugs") ?? "";
  const slugs = raw
    .split(",")
    .map((slug) => slug.trim())
    .filter((slug) => slugPattern.test(slug))
    .slice(0, 12);
  const products = await loadCardsBySlugs(slugs);
  return NextResponse.json({ products });
}
