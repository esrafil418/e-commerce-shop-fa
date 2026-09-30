import Link from "next/link";
import { getCurrentActor } from "@/lib/auth/current-user";
import { authCopy } from "@/features/auth/messages";
import { storeCopy } from "@/messages/fa";

export default async function ProfilePage() {
  const actor = await getCurrentActor();
  if (!actor) return null;

  return (
    <div className="flex max-w-xl flex-col gap-4">
      <h1 className="text-2xl font-bold">{storeCopy.profile}</h1>
      <p className="text-sm text-muted-foreground">{actor.email}</p>
      {actor.emailConfirmed ? null : <p role="status">{authCopy.unverifiedBanner}</p>}
      <p>{storeCopy.profileIntro}</p>
      <ul className="flex flex-col gap-2 text-sm">
        <li><Link href="/profile/orders">{storeCopy.orders}</Link></li>
        <li><Link href="/profile/addresses">{storeCopy.addresses}</Link></li>
        <li><Link href="/profile/wishlist">{storeCopy.wishlist}</Link></li>
        <li><Link href="/profile/settings">{storeCopy.settings}</Link></li>
      </ul>
    </div>
  );
}
