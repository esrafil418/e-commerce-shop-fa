import { HomeContent } from "@/components/home-content";
import { readCatalogQuery } from "@/lib/search-params";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const query = readCatalogQuery(params);

  return <HomeContent query={query.q} />;
}
