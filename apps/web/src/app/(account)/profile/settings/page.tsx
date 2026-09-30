import { logoutAction, updateProfileAction } from "@/features/auth/actions";
import { AuthForm } from "@/features/auth/auth-form";
import { authCopy } from "@/features/auth/messages";
import { getCurrentActor, getOwnProfile } from "@/lib/auth/current-user";
import { Button } from "@ecom/ui/components/button";
import { storeCopy } from "@/messages/fa";

export default async function SettingsPage() {
  const actor = await getCurrentActor();
  if (!actor) return null;
  const profile = await getOwnProfile(actor);

  return (
    <div className="flex max-w-md flex-col gap-6">
      <h1 className="text-2xl font-semibold">{storeCopy.settings}</h1>
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
        submitLabel={storeCopy.saveSettings}
      />
      <form action={logoutAction}>
        <Button type="submit" variant="outline">
          {authCopy.logout}
        </Button>
      </form>
    </div>
  );
}
