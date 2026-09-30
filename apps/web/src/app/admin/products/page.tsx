import { AdminSection } from "@/features/auth/admin-section";
import { authCopy } from "@/features/auth/messages";
import { canManageProducts } from "@/features/auth/permissions";
import { getCurrentActor } from "@/lib/auth/current-user";

export default async function AdminProductsPage() {
  const actor = await getCurrentActor();
  return (
    <AdminSection allowed={canManageProducts(actor)} title={authCopy.adminProducts} />
  );
}
