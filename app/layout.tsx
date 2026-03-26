import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { Geist, Geist_Mono } from "next/font/google";
import SiteChrome from "@/components/layout/SiteChrome";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TGEM Sports | College Football Picks & Analytics",
  description:
    "TGEM Sports delivers advanced college football predictions, matchup analysis, and pick'em insights powered by the Tactical Game Evaluation Model.",
  keywords: [
    "college football picks",
    "pick'em predictions",
    "sports analytics",
    "football predictions",
    "college football analysis",
    "TGEM Sports",
  ],
  other: {
    "google-adsense-account": "ca-pub-5009402663425957",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="color-scheme" content="light dark" />
        <meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)" />
        <meta name="theme-color" content="#030712" media="(prefers-color-scheme: dark)" />
        <meta
          name="google-site-verification"
          content="gMdTZ3IScxqoU32cCT7cpwFP1JUVj3UrZvD1ZcJgrss"
        />
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5009402663425957"
          crossOrigin="anonymous"
        />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <SiteChrome>{children}</SiteChrome>
        <Analytics />
      </body>
    </html>
  );
}
