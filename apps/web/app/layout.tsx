import type { Metadata } from "next";
import "./globals.css";
import localFont from "next/font/local";
import Sidebar from "./components/Sidebar";

const inter = localFont({
  src: "./fonts/inter.woff2",
  weight: "100 900",
  variable: "--font-sans",
  display: "swap",
});

const jetbrains = localFont({
  src: "./fonts/jetbrains-mono.woff2",
  weight: "100 800",
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Algophony Bench Dashboard",
  description: "Studio-aligned research and benchmark dashboard for Algophony",
};

const PLAYGROUND_ENABLED = process.env.ALGOPHONY_ENABLE_PLAYGROUND === "true";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrains.variable}`}>
      <body suppressHydrationWarning>
        <div className="app-layout">
          <Sidebar playgroundEnabled={PLAYGROUND_ENABLED} />
          <main className="main-content">{children}</main>
        </div>
      </body>
    </html>
  );
}
