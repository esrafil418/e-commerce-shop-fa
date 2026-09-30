import Link from "next/link";
import { logoutAction, updateProfileAction } from "@/features/auth/actions";
import { AuthForm } from "@/features/auth/auth-form";
import { authCopy } from "@/features/auth/messages";
import { isStaff } from "@/features/auth/permissions";
import { getCurrentActor, getOwnProfile } from "@/lib/auth/current-user";
import { Button } from "@ecom/ui/components/button";

export default async function AccountPage() {
  const actor = await getCurrentActor();
  if (!actor) {
    return null;
  }
  const profile = await getOwnProfile(actor);

  return (
    <div className="flex max-w-md flex-col gap-6">
      <h1 className="text-2xl font-semibold">{authCopy.accountTitle}</h1>
      <p className="text-sm text-muted-foreground">{actor.email}</p>
      {actor.emailConfirmed ? null : (
        <p className="text-sm" role="status">
          {authCopy.unverifiedBanner}
        </p>
      )}
      <h2 className="text-lg font-medium">{authCopy.profileTitle}</h2>
      <AuthForm
        action={updateProfileAction}
        fields={[
          {
            name: "fullName",
            label: authCopy.fullName,
            autoComplete: "name",
            defaultValue: profile?.fullName ?? "",
          },
          {
            name: "phone",
            label: authCopy.phone,
            autoComplete: "tel",
            defaultValue: profile?.phone ?? "",
          },
        ]}
        submitLabel={authCopy.profileSubmit}
      />
      {isStaff(actor) ? (
        <Link className="text-sm font-medium" href="/admin">
          {authCopy.goToAdmin}
        </Link>
      ) : null}
      <form action={logoutAction}>
        <Button type="submit" variant="outline">
          {authCopy.logout}
        </Button>
      </form>
    </div>
  );
}
