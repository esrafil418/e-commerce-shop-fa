import Link from "next/link";
import { siteCopy, storeCopy } from "@/messages/fa";

const container = "mx-auto w-full max-w-7xl px-4";

export function Footer() {
  return (
    <footer className="mt-auto border-t">
      <div className={`${container} grid gap-6 py-8 text-sm md:grid-cols-3`}>
        <div className="flex flex-col gap-2">
          <p className="font-medium text-foreground">{storeCopy.footerShop}</p>
          <Link href="/products">{storeCopy.products}</Link>
          <Link href="/categories">{storeCopy.categories}</Link>
          <Link href="/search">{storeCopy.searchPage}</Link>
        </div>
        <div className="flex flex-col gap-2">
          <p className="font-medium text-foreground">{storeCopy.footerAccount}</p>
          <Link href="/profile">{storeCopy.profile}</Link>
          <Link href="/orders">{storeCopy.orders}</Link>
          <Link href="/wishlist">{storeCopy.wishlist}</Link>
        </div>
        <div className="flex flex-col gap-2">
          <p className="font-medium text-foreground">{storeCopy.footerHelp}</p>
          <p className="text-muted-foreground">{storeCopy.helpBody}</p>
          <p className="text-muted-foreground">{siteCopy.name}</p>
        </div>
      </div>
    </footer>
  );
}
