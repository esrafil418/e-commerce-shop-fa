import { authCopy } from "@/features/auth/messages";

export default function AdminHomePage() {
  return (
    <div className="flex flex-col gap-3">
      <h1 className="text-2xl font-semibold">{authCopy.adminTitle}</h1>
      <p className="max-w-prose text-sm text-muted-foreground">
        {authCopy.adminIntro}
      </p>
    </div>
  );
}
