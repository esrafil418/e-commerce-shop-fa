import { StoreHeader } from "@/components/store-header";
import { isStaff } from "@/features/auth/permissions";
import { loadCart } from "@/features/cart/server";
import { getCurrentActor } from "@/lib/auth/current-user";

export async function Header() {
  const actor = await getCurrentActor();
  const cart = await loadCart();

  return (
    <StoreHeader
      cart={cart}
      email={actor?.email ?? null}
      signedIn={Boolean(actor)}
      staff={Boolean(actor && isStaff(actor))}
    />
  );
}
