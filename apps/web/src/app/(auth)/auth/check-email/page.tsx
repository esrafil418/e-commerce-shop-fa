import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@ecom/ui/components/card";
import { authCopy } from "@/features/auth/messages";

export default function CheckEmailPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{authCopy.verifyTitle}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{authCopy.verifyBody}</p>
      </CardContent>
    </Card>
  );
}
