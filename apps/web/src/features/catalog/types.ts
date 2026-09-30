export type StockState = "in_stock" | "out_of_stock" | "unknown";

export type MediaAsset = {
  publicId: string;
  alt: string;
  width: number | null;
  height: number | null;
  kind: "image" | "video";
};

export type CatalogCard = {
  id: string;
  slug: string;
  name: string;
  brandName: string | null;
  brandSlug: string | null;
  image: MediaAsset | null;
  priceRial: number;
  compareAtPriceRial: number | null;
  discountPercent: number | null;
  rating: number | null;
  reviewCount: number;
  stock: StockState;
  defaultVariantId: string | null;
};

export type RichCard = CatalogCard & {
  publishedAt: number;
};

export type VariantChoice = {
  id: string;
  sku: string;
  priceRial: number;
  compareAtPriceRial: number | null;
  optionValueIds: string[];
  available: number | null;
};

export type OptionGroup = {
  id: string;
  name: string;
  values: { id: string; label: string }[];
};

export type SpecGroup = {
  name: string;
  rows: { name: string; value: string }[];
};

export type ReviewItem = {
  id: string;
  rating: number;
  body: string;
};

export type ProductDetail = {
  card: CatalogCard;
  description: string;
  variants: VariantChoice[];
  options: OptionGroup[];
  specifications: SpecGroup[];
  gallery: MediaAsset[];
  related: CatalogCard[];
  reviews: ReviewItem[];
  sellerName: string;
};

export type CategorySummary = {
  id: string;
  slug: string;
  name: string;
  parentId: string | null;
  path: string;
};

export type BrandSummary = {
  id: string;
  slug: string;
  name: string;
  logoPublicId: string | null;
};

export type StoreBanner = {
  id: string;
  title: string;
  href: string;
  imagePublicId: string | null;
};

export type ListingResult = {
  status: "ready" | "unavailable";
  items: CatalogCard[];
  total: number;
  page: number;
  pageSize: number;
};

export type HomeModel = {
  status: "ready" | "unavailable";
  categories: CategorySummary[];
  brands: BrandSummary[];
  featured: CatalogCard[];
  discounted: CatalogCard[];
  popular: CatalogCard[];
  banners: StoreBanner[];
};

export type SuggestHit = {
  label: string;
  href: string;
};

export type SitemapEntry = {
  path: string;
  lastModified?: string;
};
