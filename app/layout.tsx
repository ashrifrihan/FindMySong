import type { Metadata, Viewport } from "next";
import TopBar from "@/components/TopBar";
import TabBar from "@/components/TabBar";
import AmbientBackground from "@/components/AmbientBackground";
import Player from "@/components/Player";
import { PlayerProvider } from "@/lib/player";
import { tintBootScript, themeBootScript } from "@/lib/appearance";
import "./globals.css";

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
    { media: "(prefers-color-scheme: light)", color: "#f4f6fb" },
    { media: "(prefers-color-scheme: dark)",  color: "#0a0a0f" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Run before paint: restore tint + theme from localStorage to avoid flash */}
        <script dangerouslySetInnerHTML={{ __html: themeBootScript + tintBootScript }} />
      </head>
      <body>
        <PlayerProvider>
          <AmbientBackground />
          <TopBar />
          <main className="wrap">{children}</main>
          <Player />
          <TabBar />
        </PlayerProvider>
      </body>
    </html>
  );
}
