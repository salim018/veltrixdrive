import type { Metadata } from "next";
import "./globals.css";
import { I18nProvider } from "@/lib/i18n/provider";
import { CookieBanner } from "@/components/CookieBanner";

export const metadata: Metadata = {
  title: "VeltrixDrive — Know before you buy",
  description:
    "VeltrixDrive analyzes any car listing and tells you instantly if it's worth it. AI-powered buying decisions.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000")
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white">
        <I18nProvider>
          {children}
          <CookieBanner />
        </I18nProvider>
      </body>
    </html>
  );
}
