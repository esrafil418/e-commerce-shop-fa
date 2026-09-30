import { z } from "zod";

export const catalogSortValues = [
  "newest",
  "price_asc",
  "price_desc",
  "popular",
] as const;

export const catalogSortSchema = z.enum(catalogSortValues);

export const catalogPageSchema = z.coerce.number().int().min(1).catch(1);

export const catalogQuerySchema = z.object({
  q: z.string().trim().max(80).optional().default(""),
  sort: catalogSortSchema.catch("newest"),
  page: catalogPageSchema,
});

export type CatalogSort = z.infer<typeof catalogSortSchema>;
export type CatalogQuery = z.infer<typeof catalogQuerySchema>;
