import { AdminSection } from "@/features/auth/admin-section";
import { authCopy } from "@/features/auth/messages";
import { canManageInventory } from "@/features/auth/permissions";
import { getCurrentActor } from "@/lib/auth/current-user";

export default async function AdminInventoryPage() {
  const actor = await getCurrentActor();
  return (
    <AdminSection
      allowed={canManageInventory(actor)}
      title={authCopy.adminInventory}
    />
  );
}
