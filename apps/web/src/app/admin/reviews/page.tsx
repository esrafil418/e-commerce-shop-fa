import { AdminSection } from "@/features/auth/admin-section";
import { authCopy } from "@/features/auth/messages";
import { canModerateReviews } from "@/features/auth/permissions";
import { getCurrentActor } from "@/lib/auth/current-user";

export default async function AdminReviewsPage() {
  const actor = await getCurrentActor();
  return (
    <AdminSection
      allowed={canModerateReviews(actor)}
      title={authCopy.adminReviews}
    />
  );
}
