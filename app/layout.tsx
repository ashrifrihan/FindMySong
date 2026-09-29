import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import TopBar from "@/components/TopBar";
import TabBar from "@/components/TabBar";
import { tintBootScript } from "@/lib/appearance";
import "./globals.css";

// Apple devices use SF Pro (system font). Android/Windows get Inter, which is designed to look like it.
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  title: "FindMySong",
  description: "Find a track's ISRC or UPC code and paste it into Instagram Music search.",
  appleWebApp: { capable: true, title: "FindMySong", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#eef1f8" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: tintBootScript }} />
      </head>
      <body>
        <div className="wallpaper" aria-hidden><i /><i /><i /><i /></div>
        <TopBar />
        <main className="wrap">{children}</main>
        <TabBar />
      </body>
    </html>
  );
}
