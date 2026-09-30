import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@ecom/ui/components/card";
import { updatePasswordAction } from "@/features/auth/actions";
import { AuthForm } from "@/features/auth/auth-form";
import { authCopy } from "@/features/auth/messages";

export default function UpdatePasswordPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{authCopy.updatePasswordTitle}</CardTitle>
      </CardHeader>
      <CardContent>
        <AuthForm
          action={updatePasswordAction}
          fields={[
            {
              name: "password",
              label: authCopy.password,
              type: "password",
              autoComplete: "new-password",
            },
          ]}
          submitLabel={authCopy.updatePasswordSubmit}
        />
      </CardContent>
    </Card>
  );
}
