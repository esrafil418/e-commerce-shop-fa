import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Vazirmatn } from "next/font/google";
import { Providers } from "@/client/providers";
import { readPublicEnv } from "@/lib/env/public";
import { siteCopy } from "@/messages/fa";
import "./globals.css";

const vazirmatn = Vazirmatn({
  subsets: ["arabic", "latin"],
  display: "swap",
  variable: "--font-vazirmatn",
});

const siteUrl = readPublicEnv().NEXT_PUBLIC_SITE_URL;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: siteCopy.name,
    template: `%s | ${siteCopy.name}`,
  },
  description: siteCopy.description,
  openGraph: {
    locale: "fa_IR",
    type: "website",
    siteName: siteCopy.name,
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html
      className={`${vazirmatn.variable} h-full`}
      dir="rtl"
      lang="fa"
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
