import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ProfileNav } from "@/features/profile/ui/profile-nav";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function ProfileLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col gap-6">
      <ProfileNav />
      {children}
    </div>
  );
}
