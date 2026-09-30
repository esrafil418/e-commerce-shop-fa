import {
  catalogSortValues,
  type CatalogSort,
} from "@ecom/validation";
import {
  parseAsInteger,
  parseAsString,
  parseAsStringLiteral,
} from "nuqs/server";

export const catalogSearchParsers = {
  q: parseAsString.withDefault(""),
  sort: parseAsStringLiteral(catalogSortValues).withDefault("newest"),
  page: parseAsInteger.withDefault(1),
};

export function readCatalogQuery(params: {
  q?: string | string[];
  sort?: string | string[];
  page?: string | string[];
}): { q: string; sort: CatalogSort; page: number } {
  const q = first(params.q).trim().slice(0, 80);
  const sortValue = first(params.sort);
  const sort = catalogSortValues.includes(sortValue as CatalogSort)
    ? (sortValue as CatalogSort)
    : "newest";
  const pageNumber = Number(first(params.page));
  const page = Number.isInteger(pageNumber) && pageNumber >= 1 ? pageNumber : 1;

  return { q, sort, page };
}

function first(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }
  return value ?? "";
}
