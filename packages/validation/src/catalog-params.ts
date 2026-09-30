import { z } from "zod";

export const catalogSortValues = [
  "newest",
  "price_asc",
  "price_desc",
  "popular",
] as const;

export const catalogSortSchema = z.enum(catalogSortValues);

export const catalogPageSchema = z.coerce.number().int().min(1).catch(1);

const slugList = z.array(z.string().trim().min(1).max(80)).max(24);

const tomanBound = z.number().int().min(0).max(1_000_000_000);

export const catalogQuerySchema = z.object({
  q: z.string().trim().max(80).optional().default(""),
  sort: catalogSortSchema.catch("newest"),
  page: catalogPageSchema,
  category: z.string().trim().max(80).optional().default(""),
  brand: slugList.optional().default([]),
  attr: slugList.optional().default([]),
  min: tomanBound.optional(),
  max: tomanBound.optional(),
  inStock: z.boolean().optional().default(false),
});

export type CatalogSort = z.infer<typeof catalogSortSchema>;
export type CatalogQuery = z.infer<typeof catalogQuerySchema>;
