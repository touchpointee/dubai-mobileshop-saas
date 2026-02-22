import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { PwaRegistration } from "@/components/layout/PwaRegistration";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Dubai Mobile Shop POS",
  description: "Cloud POS system for Dubai mobile shops",
  manifest: "/manifest.webmanifest",
  themeColor: "#0d9488",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "POS" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html suppressHydrationWarning className={inter.variable}>
      <body className="min-h-screen font-sans">
        <PwaRegistration />
        {children}
      </body>
    </html>
  );
}
