import { AdminSection } from "@/features/auth/admin-section";
import { authCopy } from "@/features/auth/messages";
import { canManageOrders } from "@/features/auth/permissions";
import { getCurrentActor } from "@/lib/auth/current-user";

export default async function AdminOrdersPage() {
  const actor = await getCurrentActor();
  return (
    <AdminSection allowed={canManageOrders(actor)} title={authCopy.adminOrders} />
  );
}
