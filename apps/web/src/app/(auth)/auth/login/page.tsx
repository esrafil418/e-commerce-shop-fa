import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@ecom/ui/components/card";
import { loginAction } from "@/features/auth/actions";
import { AuthForm } from "@/features/auth/auth-form";
import { authCopy } from "@/features/auth/messages";
import { sanitizeRedirectPath } from "@/features/auth/redirect";
import { getCurrentActor } from "@/lib/auth/current-user";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const actor = await getCurrentActor();
  const params = await searchParams;
  const next = sanitizeRedirectPath(params.next, "/account");
  if (actor) {
    redirect(next);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{authCopy.loginTitle}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <AuthForm
          action={loginAction}
          extra={
            <div className="flex flex-col gap-2 text-sm">
              <Link href="/auth/forgot">{authCopy.forgotLink}</Link>
              <Link href="/auth/register">{authCopy.registerLink}</Link>
            </div>
          }
          fields={[
            {
              name: "email",
              label: authCopy.email,
              type: "email",
              autoComplete: "email",
            },
            {
              name: "password",
              label: authCopy.password,
              type: "password",
              autoComplete: "current-password",
            },
          ]}
          hidden={{ next }}
          submitLabel={authCopy.loginSubmit}
        />
      </CardContent>
    </Card>
  );
}
