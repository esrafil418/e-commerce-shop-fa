import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@ecom/ui/components/card";
import { registerAction } from "@/features/auth/actions";
import { AuthForm } from "@/features/auth/auth-form";
import { authCopy } from "@/features/auth/messages";
import { getCurrentActor } from "@/lib/auth/current-user";

export default async function RegisterPage() {
  const actor = await getCurrentActor();
  if (actor) {
    redirect("/account");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{authCopy.registerTitle}</CardTitle>
      </CardHeader>
      <CardContent>
        <AuthForm
          action={registerAction}
          extra={<Link href="/auth/login">{authCopy.loginLink}</Link>}
          fields={[
            {
              name: "fullName",
              label: authCopy.fullName,
              autoComplete: "name",
            },
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
              autoComplete: "new-password",
            },
          ]}
          submitLabel={authCopy.registerSubmit}
        />
      </CardContent>
    </Card>
  );
}
