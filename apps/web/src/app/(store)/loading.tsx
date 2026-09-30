import { ProductPlaceholder } from "@ecom/ui/components/product-placeholder";
import { siteCopy } from "@/messages/fa";

export default function StoreLoading() {
  return (
    <div aria-busy="true" aria-label={siteCopy.loading} className="flex flex-col gap-6">
      <div className="h-40 rounded-2xl bg-muted" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <ProductPlaceholder key={index} />
        ))}
      </div>
    </div>
  );
}
