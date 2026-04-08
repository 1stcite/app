import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { headers } from "next/headers";
import { ConferenceProvider, type ConferenceConfig } from "@/app/lib/conferenceContext";
import { getDb } from "@/app/lib/db";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "1stCite",
  description: "Conference presentation viewer",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "1stCite",
  },
};

async function getConferenceConfig(subdomain: string): Promise<ConferenceConfig> {
  const DEFAULT: ConferenceConfig = {
    subdomain,
    name: "1stCite",
    logo: "/1stcite-logo.png",
    sourceId: subdomain || "1stcite",
    isRepo: false,
  };

  if (!subdomain || subdomain === "1stcite") return DEFAULT;

  if (subdomain === "presentrxiv" || subdomain === "www") {
    return { subdomain, name: "PresentrXiv", logo: "/presentrxiv-logo.png", sourceId: "", isRepo: true };
  }

  try {
    const db = await getDb();
    const conf = await db.collection("conferences").findOne({ subdomain, active: true });
    if (conf) return conf as unknown as ConferenceConfig;
  } catch {}

  return DEFAULT;
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const headersList = await headers();
  const subdomain = headersList.get("x-subdomain") ?? process.env.NEXT_PUBLIC_SITE_ID ?? "1stcite";
  const config = await getConferenceConfig(subdomain);

  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content={config.name} />
        <link rel="apple-touch-icon" href={config.logo} />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased text-gray-900 bg-gray-50`}>
        <ConferenceProvider config={config}>
          {children}
        </ConferenceProvider>
      </body>
    </html>
  );
}
