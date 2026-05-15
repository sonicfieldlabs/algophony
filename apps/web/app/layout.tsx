import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Algophony — Soundscape Benchmark",
  description: "Benchmark dashboard for text-to-soundscape generation research",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="app-layout">
          <aside className="sidebar">
            <div className="sidebar-brand">Algophony</div>
            <div className="sidebar-version">benchmark lite v0.1</div>
            <nav>
              <ul className="sidebar-nav">
                <li><Link href="/"><span className="nav-icon">◉</span> Overview</Link></li>
                <li><Link href="/prompts"><span className="nav-icon">◈</span> Prompts</Link></li>
                <li><Link href="/generations"><span className="nav-icon">◆</span> Generations</Link></li>
                <li><Link href="/reports"><span className="nav-icon">◇</span> Reports</Link></li>
                <li><Link href="/comparison"><span className="nav-icon">⊞</span> Comparison</Link></li>
              </ul>
            </nav>
          </aside>
          <main className="main-content">{children}</main>
        </div>
      </body>
    </html>
  );
}
