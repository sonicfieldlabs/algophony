import type { Metadata } from "next";
import "./globals.css";
import { Inter, JetBrains_Mono } from "next/font/google";
import Sidebar from "./components/Sidebar";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
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
