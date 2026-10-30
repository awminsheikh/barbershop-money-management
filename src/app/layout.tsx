import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { AppShell } from "@/components/AppShell";

const vazir = localFont({
  src: "./fonts/Vazirmatn.woff2",
  variable: "--font-vazir",
  display: "swap",
  weight: "100 900",
});

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export const metadata: Metadata = {
  title: "الماس | مدیریت آرایشگاه",
  description: "حسابداری، نوبت‌دهی و مشتریان آرایشگاه",
};

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa" dir="rtl" className={vazir.variable}>
      <head>
        <link rel="manifest" href={`${basePath}/manifest.webmanifest`} />
        <link rel="icon" href={`${basePath}/icons/icon-192.png`} />
        <link rel="apple-touch-icon" href={`${basePath}/apple-touch-icon.png`} />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="الماس" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black" />
      </head>
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
