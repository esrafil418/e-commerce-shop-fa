import { appRoles } from "@ecom/validation";
import { AdminSection } from "@/features/auth/admin-section";
import { grantRoleAction, revokeRoleAction } from "@/features/auth/actions";
import { AuthForm } from "@/features/auth/auth-form";
import { authCopy } from "@/features/auth/messages";
import { canManageRoles } from "@/features/auth/permissions";
import { getCurrentActor } from "@/lib/auth/current-user";
import { Label } from "@ecom/ui/components/label";

export default async function AdminRolesPage() {
  const actor = await getCurrentActor();

  return (
    <AdminSection allowed={canManageRoles(actor)} title={authCopy.adminRoles}>
      <div className="flex max-w-md flex-col gap-8">
        <AuthForm
          action={grantRoleAction}
          fields={[
            {
              name: "userId",
              id: "grant-user-id",
              label: authCopy.userId,
              autoComplete: "off",
            },
          ]}
          submitLabel={authCopy.grantRoleSubmit}
          extra={
            <div className="flex flex-col gap-2">
              <Label htmlFor="grant-role">{authCopy.role}</Label>
              <select
                className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
                defaultValue="support"
                id="grant-role"
                name="role"
              >
                {appRoles.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
            </div>
          }
        />
        <AuthForm
          action={revokeRoleAction}
          fields={[
            {
              name: "userId",
              id: "revoke-user-id",
              label: authCopy.userId,
              autoComplete: "off",
            },
          ]}
          submitLabel={authCopy.revokeRoleSubmit}
          extra={
            <div className="flex flex-col gap-2">
              <Label htmlFor="revoke-role">{authCopy.role}</Label>
              <select
                className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
                defaultValue="support"
                id="revoke-role"
                name="role"
              >
                {appRoles.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
            </div>
          }
        />
      </div>
    </AdminSection>
  );
}
