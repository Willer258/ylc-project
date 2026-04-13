import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Be_Vietnam_Pro } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/app-shell";

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-headline",
  subsets: ["latin"],
  weight: ["400", "700", "800"],
  display: "swap",
});

const beVietnam = Be_Vietnam_Pro({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Young Christian Life",
  description: "Application evenementielle chretienne — chasse au tresor et aventure",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

const materialSymbolsUrl =
  "https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={`${plusJakarta.variable} ${beVietnam.variable}`}>
      <head>
        <link href={materialSymbolsUrl} rel="stylesheet" />
      </head>
      <body className="min-h-dvh bg-background text-on-surface font-body selection:bg-secondary-container">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
