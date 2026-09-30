import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@ecom/ui/components/card";
import { requestPasswordResetAction } from "@/features/auth/actions";
import { AuthForm } from "@/features/auth/auth-form";
import { authCopy } from "@/features/auth/messages";

export default function ForgotPasswordPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{authCopy.forgotTitle}</CardTitle>
      </CardHeader>
      <CardContent>
        <AuthForm
          action={requestPasswordResetAction}
          fields={[
            {
              name: "email",
              label: authCopy.email,
              type: "email",
              autoComplete: "email",
            },
          ]}
          submitLabel={authCopy.forgotSubmit}
        />
      </CardContent>
    </Card>
  );
}
