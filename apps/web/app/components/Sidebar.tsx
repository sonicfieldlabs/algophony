"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";

type Item = { href: string; icon: string; label: string };

export default function Sidebar({ studioEnabled }: { studioEnabled: boolean }) {
  const pathname = usePathname() || "/";
  const [open, setOpen] = useState(false);

  // Close drawer on route change.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const items: Item[] = [
    { href: "/", icon: "◈", label: "Overview" },
    { href: "/atlas", icon: "◎", label: "Atlas" },
    { href: "/prompts", icon: "✎", label: "Prompts" },
    { href: "/generations", icon: "⟳", label: "Generations" },
    { href: "/reports", icon: "☷", label: "Reports" },
    { href: "/comparison", icon: "⇔", label: "Comparison" },
    { href: "/providers", icon: "⬡", label: "Providers" },
    { href: "/benchmark", icon: "△", label: "Benchmark" },
    { href: "/export", icon: "↗", label: "Export" },
    { href: "/observatory", icon: "◉", label: "Observatory" },
  ];
  if (studioEnabled) {
    items.push({ href: "/playground", icon: "⚗", label: "Playground" });
  }

  function isActive(href: string): boolean {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <>
      <button
        type="button"
        className="mobile-nav-toggle"
        aria-label={open ? "Close navigation" : "Open navigation"}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? "✕" : "☰"}
      </button>
      {open && <div className="mobile-nav-backdrop" onClick={() => setOpen(false)} aria-hidden="true" />}
      <aside className={`sidebar ${open ? "sidebar-open" : ""}`}>
        <div className="sidebar-brand">Algophony</div>
        <div className="sidebar-version">platform v0.2</div>
        <nav aria-label="Primary">
          <ul className="sidebar-nav">
            {items.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className={isActive(item.href) ? "active" : undefined} aria-current={isActive(item.href) ? "page" : undefined}>
                  <span className="nav-icon">{item.icon}</span> {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </aside>
    </>
  );
}
