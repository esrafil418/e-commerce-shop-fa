import Link from "next/link";
import { storeCopy } from "@/messages/fa";

const links = [
  ["/profile", storeCopy.profile],
  ["/profile/orders", storeCopy.orders],
  ["/profile/addresses", storeCopy.addresses],
  ["/profile/wishlist", storeCopy.wishlist],
  ["/profile/settings", storeCopy.settings],
] as const;

export function ProfileNav() {
  return (
    <nav aria-label={storeCopy.profile} className="flex gap-2 overflow-x-auto pb-2">
      {links.map(([href, label]) => (
        <Link
          className="rounded-full border px-3 py-1.5 text-sm focus-visible:ring-3 focus-visible:ring-ring"
          href={href}
          key={href}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
