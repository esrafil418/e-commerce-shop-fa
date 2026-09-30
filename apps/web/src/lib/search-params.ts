import {
  catalogQuerySchema,
  catalogSortValues,
  type CatalogQuery,
  type CatalogSort,
} from "@ecom/validation";
import {
  parseAsArrayOf,
  parseAsInteger,
  parseAsString,
  parseAsStringLiteral,
} from "nuqs/server";

export const catalogSearchParsers = {
  q: parseAsString.withDefault(""),
  sort: parseAsStringLiteral(catalogSortValues).withDefault("newest"),
  page: parseAsInteger.withDefault(1),
  brand: parseAsArrayOf(parseAsString).withDefault([]),
  attr: parseAsArrayOf(parseAsString).withDefault([]),
  min: parseAsInteger,
  max: parseAsInteger,
  inStock: parseAsString.withDefault(""),
};

export function readCatalogQuery(
  params: Record<string, string | string[] | undefined>,
): CatalogQuery {
  const min = optionalToman(first(params.min));
  const max = optionalToman(first(params.max));
  const sortValue = first(params.sort);
  const sort: CatalogSort = catalogSortValues.includes(sortValue as CatalogSort)
    ? (sortValue as CatalogSort)
    : "newest";

  return catalogQuerySchema.parse({
    q: first(params.q),
    sort,
    page: first(params.page) || undefined,
    category: first(params.category),
    brand: many(params.brand).slice(0, 24),
    attr: many(params.attr).slice(0, 24),
    min,
    max,
    inStock: first(params.inStock) === "1" || first(params.inStock) === "true",
  });
}

function optionalToman(value: string): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 1_000_000_000) {
    return undefined;
  }
  return parsed;
}

function first(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function many(value: string | string[] | undefined): string[] {
  const values = Array.isArray(value) ? value : value ? [value] : [];
  return values
    .flatMap((item) => item.split(","))
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}
