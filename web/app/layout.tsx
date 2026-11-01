import type { Metadata } from "next";
import { Noto_Sans_Bengali } from "next/font/google";
import "./globals.css";
import AppShell from "@/components/AppShell";

const notoSansBengali = Noto_Sans_Bengali({
  subsets: ["bengali", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-bengali",
  display: "swap",
});

export const metadata: Metadata = {
  title: "BIAI CRM",
  description: "BIAI Enquiries, Pipeline and Lead Management CRM",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={notoSansBengali.variable}>
      <body className={notoSansBengali.className}>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
