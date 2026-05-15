import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";
import { Inter, JetBrains_Mono } from "next/font/google";

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
  title: "Algophony - Soundscape Benchmark",
  description: "Research dashboard for algorithmic soundscape evaluation",
};

const STUDIO_ENABLED = process.env.ALGOPHONY_ENABLE_STUDIO === "true";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrains.variable}`}>
      <body suppressHydrationWarning>
        <div className="app-layout">
          <aside className="sidebar">
            <div className="sidebar-brand">Algophony</div>
            <div className="sidebar-version">benchmark lite v0.1.1</div>
            <nav>
              <ul className="sidebar-nav">
                <li><Link href="/"><span className="nav-icon">◈</span> Overview</Link></li>
                <li><Link href="/atlas"><span className="nav-icon">◎</span> Atlas</Link></li>
                <li><Link href="/prompts"><span className="nav-icon">✎</span> Prompts</Link></li>
                <li><Link href="/generations"><span className="nav-icon">⟳</span> Generations</Link></li>
                <li><Link href="/reports"><span className="nav-icon">☷</span> Reports</Link></li>
                <li><Link href="/comparison"><span className="nav-icon">⇔</span> Comparison</Link></li>
                <li><Link href="/providers"><span className="nav-icon">⬡</span> Providers</Link></li>
                <li><Link href="/benchmark"><span className="nav-icon">△</span> Benchmark</Link></li>
                <li><Link href="/export"><span className="nav-icon">↗</span> Export</Link></li>
                <li><Link href="/observatory"><span className="nav-icon">◉</span> Observatory</Link></li>
                {STUDIO_ENABLED && (
                  <li><Link href="/playground"><span className="nav-icon">⚗</span> Playground</Link></li>
                )}
              </ul>
            </nav>
          </aside>
          <main className="main-content">{children}</main>
        </div>
      </body>
    </html>
  );
}
