import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "1stCite — Engaging Science",
  description: "Conference Engagement Platform for Scientific Societies",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "1stCite",
  },
  openGraph: {
    title: "1stCite — Engaging Science",
    description: "Conference Engagement Platform for Scientific Societies",
    url: "https://1stcite.com",
    siteName: "1stCite",
    images: [{ url: "https://1stcite.com/og-image.png", width: 1200, height: 630 }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "1stCite — Engaging Science",
    description: "Conference Engagement Platform for Scientific Societies",
    images: ["https://1stcite.com/og-image.png"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="1stCite" />
        <link rel="apple-touch-icon" href="/1stcite-logo.png" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased text-gray-900 bg-gray-50`}>
        {children}
      </body>
    </html>
  );
}
