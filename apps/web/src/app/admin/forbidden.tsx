import Link from "next/link";
import { ErrorState } from "@ecom/ui/components/error-state";
import { authCopy } from "@/features/auth/messages";

export default function AdminForbidden() {
  return (
    <ErrorState
      action={
        <Link className="text-sm font-medium" href="/">
          {authCopy.backHome}
        </Link>
      }
      description={authCopy.adminForbiddenBody}
      title={authCopy.adminForbiddenTitle}
    />
  );
}
