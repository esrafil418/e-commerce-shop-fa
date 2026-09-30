export function catalogTagsFor(input: {
  slug?: string;
  categorySlug?: string;
  brandSlug?: string;
}): string[] {
  const tags = ["catalog", "home"];
  if (input.slug) {
    tags.push(`product:${input.slug}`);
  }
  if (input.categorySlug) {
    tags.push(`category:${input.categorySlug}`);
  }
  if (input.brandSlug) {
    tags.push(`brand:${input.brandSlug}`);
  }
  return tags;
}
