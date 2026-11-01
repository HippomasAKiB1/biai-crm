import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import AppShell from "@/components/AppShell";

const notoBengali = localFont({
  src: [
    { path: "../public/fonts/noto-sans-bengali-400.woff2", weight: "400", style: "normal" },
    { path: "../public/fonts/noto-sans-bengali-500.woff2", weight: "500", style: "normal" },
    { path: "../public/fonts/noto-sans-bengali-600.woff2", weight: "600", style: "normal" },
    { path: "../public/fonts/noto-sans-bengali-700.woff2", weight: "700", style: "normal" },
  ],
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
    <html lang="en" className={notoBengali.variable}>
      <body className={notoBengali.className}>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
