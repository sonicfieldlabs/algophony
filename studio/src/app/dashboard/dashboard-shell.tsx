"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Waves,
  ArrowDownToLine,
  AudioWaveform,
  Bug,
  Headphones,
  Mic,
  SlidersHorizontal,
  Atom,
  Menu,
  X,
  Sun,
  Moon,
  CloudFog,
  FlaskConical,
  Layers3,
  Footprints,
  Users,
  Settings,
  Send,
  Aperture,
  BookOpen,
  Info,
  Hexagon,
  Rocket,

  Radio,
  Cpu,
  FileText,
  LifeBuoy,
  ChevronLeft,
  ChevronRight,
  Orbit,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ToastProvider } from "./toast";
import { useTheme } from "@/app/ThemeProvider";

import { CommandPalette } from "./components/command-palette";
import { GlobalAudioPlayerProvider } from "./components/global-audio-player";
import { FloatingComposerProvider, FloatingComposerWidget } from "./components/floating-composer";
import { AtlasAvatar } from "./components/atlas-avatar";
import { AtlasMark } from "./components/atlas-mark";

const DESIGN_ITEMS = [
  { href: "/dashboard/generate", label: "Generic", icon: AudioWaveform },
  { href: "/dashboard/creature-lab", label: "Non-human", icon: Bug },
  { href: "/dashboard/human-lab", label: "Human", icon: Users },
  { href: "/dashboard/foley-room", label: "Foley Room", icon: Footprints },
  { href: "/dashboard/atmosphere-builder", label: "Atmosphere", icon: CloudFog },
  { href: "/dashboard/vehicle", label: "Vehicle", icon: Rocket },
  { href: "/dashboard/ui-elements", label: "UI Elements", icon: SlidersHorizontal },
  { href: "/dashboard/candy", label: "Misc", icon: Hexagon },
];

// Items shown inside the Tools hover-grid. Same order as the /dashboard/tools page.
const TOOLS_ITEMS = [
  { href: "/dashboard/listen", label: "Sound to Prompt", icon: Headphones },
  { href: "/dashboard/image-to-sound", label: "Image to Sound", icon: Aperture },
  { href: "/dashboard/variation-lab", label: "Variation Lab", icon: FlaskConical },
  { href: "/dashboard/stacker", label: "Stacker", icon: Layers3 },
  { href: "/dashboard/import", label: "Import", icon: ArrowDownToLine },
  { href: "/dashboard/export", label: "Export", icon: Send },
];

// The Sounds entry highlights for the hub itself plus any sub-lab so the
// "you are here" indicator stays stable as the user moves between labs.
const DESIGN_PATHS = new Set<string>([
  "/dashboard/design",
  ...DESIGN_ITEMS.map((d) => d.href),
]);

// Same idea for Tools — clicking any tool keeps the Tools row highlighted.
const TOOLS_PATHS = new Set<string>([
  "/dashboard/tools",
  ...TOOLS_ITEMS.map((d) => d.href),
]);

type NavItem = {
  href: string;
  label: string;
  icon: typeof Waves;
  hoverGrid?: typeof DESIGN_ITEMS;
  /** Custom path set for active-state highlighting — used by hub entries. */
  activePaths?: Set<string>;
  /** Inserts a thin divider before this item. */
  dividerBefore?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard/chatsfx", label: "Agent", icon: Orbit },
  { href: "/dashboard/voice-designer", label: "Voice", icon: Mic },
  { href: "/dashboard/design", label: "Sounds", icon: Radio, hoverGrid: DESIGN_ITEMS, activePaths: DESIGN_PATHS },
  { href: "/dashboard/library", label: "Library", icon: Atom },
  { href: "/dashboard/tools", label: "Tools", icon: Cpu, hoverGrid: TOOLS_ITEMS, activePaths: TOOLS_PATHS },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
  { href: "/dashboard/docs", label: "Docs", icon: BookOpen },
];

interface DashboardShellProps {
  children: React.ReactNode;
}

export function DashboardShell({
  children,
}: DashboardShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  // Sidebar collapsed state — persisted to localStorage so a user's preference
  // sticks across reloads. Defaults to false; hydrated from storage on mount.
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const closeMobile = () => setMobileOpen(false);

  // Hydrate sidebar-collapsed preference. One-shot on mount.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    try {
      if (localStorage.getItem("atlas-sidebar-collapsed") === "true") {
        setSidebarCollapsed(true);
      }
    } catch {
      // localStorage may be unavailable (private mode); fall back to default.
    }
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  const toggleSidebarCollapsed = useCallback(() => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("atlas-sidebar-collapsed", String(next));
      } catch {
        // noop
      }
      return next;
    });
  }, []);

  // ── Get current page info (icon, title, subtitle) for the top bar ──
  const getPageInfo = (): { icon?: typeof Waves; title: string; subtitle?: string } => {
    if (pathname === "/dashboard" || pathname === "/dashboard/home") {
      return { title: "Home", subtitle: "Workspace overview" };
    }

    if (pathname === "/dashboard/voice-designer") {
      return { icon: Mic, title: "Voice Designer", subtitle: "Local provider-key generation and voice material experiments" };
    }

    // Sounds sub-pages
    if (DESIGN_PATHS.has(pathname)) {
      if (pathname === "/dashboard/design") return { icon: Radio, title: "Sounds", subtitle: "Labs for generated and existing sound material" };
      const item = DESIGN_ITEMS.find((d) => d.href === pathname);
      if (item) {
        const subtitles: Record<string, string> = {
          "/dashboard/generate": "Open-ended sound generation with local provenance",
          "/dashboard/creature-lab": "Creatures · Fantasy · Sci-fi · Magic · Elemental",
          "/dashboard/human-lab": "Voice, body, breath, effort, crowds",
          "/dashboard/foley-room": "Footsteps, props, cloth, physical interactions",
          "/dashboard/atmosphere-builder": "Ambient beds, room tones, environmental layers",
          "/dashboard/vehicle": "Engines, tires, brakes, passes, onboard",
          "/dashboard/ui-elements": "Clicks, chimes, alerts, transitions, notifications",
          "/dashboard/candy": "Whooshes, textures, artifacts, noise, impacts, music tools",
        };
        return { icon: item.icon, title: `Sounds · ${item.label}`, subtitle: subtitles[pathname] };
      }
    }

    // Tools sub-pages
    if (TOOLS_PATHS.has(pathname)) {
      if (pathname === "/dashboard/tools") return { icon: Cpu, title: "Tools", subtitle: "Local libraries, references, variation, layering, batch IO" };
      const item = TOOLS_ITEMS.find((d) => d.href === pathname);
      if (item) return { icon: item.icon, title: `Tools · ${item.label}` };
    }

    // Other nav items
    for (const item of NAV_ITEMS) {
      if (pathname === item.href || pathname.startsWith(item.href + "/")) {
        return { icon: item.icon, title: item.label };
      }
    }
    return { title: "Dashboard" };
  };

  // ── Close profile dropdown on outside click ──
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    if (profileOpen) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [profileOpen]);

  // ── Keyboard shortcuts ──
  const handleKeyboard = useCallback(
    (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;

      // Escape closes mobile sidebar
      if (e.key === "Escape") {
        setMobileOpen(false);
        setProfileOpen(false);
        return;
      }

      // Skip shortcuts when typing in inputs
      if (isInput) return;

      // ⌘K or Ctrl+K → open the global command palette (lives at the dashboard root)
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        // The CommandPalette component listens for the same shortcut and opens
        // itself — we just no-op here so the navigation doesn't fight it.
        return;
      }
    },
    []
  );

  // G-prefixed shortcuts (vim-like)
  useEffect(() => {
    let gPressed = false;
    let gTimeout: ReturnType<typeof setTimeout>;

    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;
      if (isInput) return;

      if (e.key === "g" && !gPressed) {
        gPressed = true;
        gTimeout = setTimeout(() => { gPressed = false; }, 500);
        return;
      }

      if (gPressed) {
        gPressed = false;
        clearTimeout(gTimeout);
        if (e.key === "g") router.push("/dashboard/generate");
        else if (e.key === "l") router.push("/dashboard/library");
      }
    };

    window.addEventListener("keydown", handler);
    window.addEventListener("keydown", handleKeyboard);
    return () => {
      window.removeEventListener("keydown", handler);
      window.removeEventListener("keydown", handleKeyboard);
    };
  }, [router, handleKeyboard]);

  // Keep local workspace utilities grouped away from primary creative tools.
  const PROFILE_ITEMS = [
    { label: "About", icon: Info, href: "/dashboard/about" },
    { label: "Local use notes", icon: FileText, href: "/dashboard/eula" },
    { label: "Feedback", icon: LifeBuoy, href: "/dashboard/support" },
  ];

  // Deterministic local workspace avatar.
  const avatarSeed = "algophony-studio-local-workspace";

  // Pre-build the sidebar so both desktop and mobile share markup. The
  // `collapse` flag only applies to desktop — the mobile drawer always
  // renders the expanded form because there's no width constraint to save.
  // The `showCollapseToggle` flag controls whether to render the inline
  // collapse/expand button — only the desktop sidebar shows it.
  const renderSidebar = (collapse: boolean, showCollapseToggle = false) => (
    <>
      {/* Logo + collapse toggle. In expanded mode the toggle sits next to
          the Algophony Studio wordmark; in collapsed mode the logo and toggle
          stack vertically so both stay tappable. */}
      <div
        className={cn(
          "flex items-center",
          collapse ? "flex-col gap-2 px-2 py-3" : "justify-between gap-2 px-5 py-4"
        )}
      >
        <Link
          href="/dashboard/home"
          onClick={closeMobile}
          className={cn(
            "flex items-center hover:opacity-80 transition-opacity min-w-0",
            collapse ? "justify-center" : "gap-3"
          )}
          title={collapse ? "Algophony Studio — Home" : "Home"}
        >
          <div className="flex h-11 w-11 items-center justify-center overflow-hidden shrink-0">
            <AtlasMark className="h-11 w-11" />
          </div>
          {!collapse && (
            <div className="min-w-0">
              <span className="block text-[15px] font-semibold text-atlas-text leading-tight">
                Algophony Studio
              </span>
              <span className="block text-xs text-atlas-text-muted mt-0.5">Sound research workspace</span>
            </div>
          )}
        </Link>

        {showCollapseToggle && (
          <button
            onClick={toggleSidebarCollapsed}
            className="rounded-md p-1.5 text-atlas-text-muted hover:bg-atlas-surface-hover hover:text-atlas-text transition-colors shrink-0"
            aria-label={collapse ? "Expand sidebar" : "Collapse sidebar"}
            title={collapse ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapse ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </button>
        )}
      </div>

      <div className={cn("h-px bg-atlas-border-subtle", collapse ? "mx-2" : "mx-4")} />

      {/* Navigation */}
      <nav className={cn("flex-1 overflow-y-auto py-4", collapse ? "px-2" : "px-3")}>
        <div className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive = item.activePaths
              ? item.activePaths.has(pathname)
              : pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <div key={item.href}>
                {item.dividerBefore && (
                  <div className="my-2 mx-1 h-px bg-atlas-border-subtle" />
                )}
                <SidebarItem
                  item={item}
                  isActive={isActive}
                  onNavigate={closeMobile}
                  pathname={pathname}
                  collapsed={collapse}
                />
              </div>
            );
          })}
        </div>
      </nav>

      {/* Bottom-left — workspace avatar with local project links. */}
      <div
        className={cn("border-t border-atlas-border-subtle py-3", collapse ? "px-2 flex justify-center" : "px-3")}
        ref={profileRef}
      >
        <div className="relative">
          <button
            onClick={() => setProfileOpen((v) => !v)}
            className={cn(
              "flex items-center justify-center h-10 w-10 rounded-full border overflow-hidden transition-all",
              profileOpen
                ? "border-atlas-accent"
                : "border-atlas-border hover:border-atlas-text-muted"
            )}
            aria-label="Workspace menu"
            title="Workspace menu"
          >
            <AtlasAvatar seed={avatarSeed} size={40} />
          </button>

          {profileOpen && (
            <div className="absolute left-0 bottom-full mb-2 w-60 rounded-xl border border-atlas-border bg-atlas-surface shadow-lg shadow-black/10 py-2 z-50 animate-fade-in">
              <div className="px-4 pt-1 pb-2">
                <p className="text-[11px] uppercase tracking-wider text-atlas-text-dim">Workspace</p>
                <p className="text-xs text-atlas-text truncate">Local project bridge</p>
              </div>
              <div className="mx-3 mb-1 h-px bg-atlas-border-subtle" />
              {PROFILE_ITEMS.map((item) => (
                <button
                  key={item.label}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setProfileOpen(false);
                    closeMobile();
                    router.push(item.href);
                  }}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-atlas-text hover:bg-atlas-surface-hover transition-colors cursor-pointer"
                >
                  <item.icon className="h-4 w-4 text-atlas-text-muted" strokeWidth={1.5} />
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );

  return (
    <FloatingComposerProvider>
    <GlobalAudioPlayerProvider>
    <div
      className="flex h-screen bg-atlas-bg"
      // The global player bar and its drawer read `--atlas-sidebar-w` so they
      // stay aligned with the visible sidebar edge as it collapses/expands.
      style={{ "--atlas-sidebar-w": sidebarCollapsed ? "64px" : "220px" } as React.CSSProperties}
    >
      {/* Desktop Sidebar — width morphs between expanded (220) and collapsed (64). */}
      <aside
        className={cn(
          "hidden lg:flex shrink-0 flex-col border-r transition-[width] duration-200 ease-out",
          sidebarCollapsed ? "w-[64px]" : "w-[220px]"
        )}
        style={{
          backgroundColor: "var(--atlas-sidebar-bg)",
          borderColor: "var(--atlas-sidebar-border)",
        }}
      >
        {renderSidebar(sidebarCollapsed, true)}
      </aside>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden animate-fade-in"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile Sidebar — always renders the expanded form; the overlay
          drawer already constrains its width on small screens. */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r transition-transform duration-300 ease-out lg:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
        style={{
          backgroundColor: "var(--atlas-sidebar-bg)",
          borderColor: "var(--atlas-sidebar-border)",
        }}
      >
        {/* Close button */}
        <button
          onClick={() => setMobileOpen(false)}
          className="absolute right-3 top-4 rounded-lg p-1.5 text-atlas-text-dim hover:bg-atlas-surface-hover hover:text-atlas-text transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
        {renderSidebar(false)}
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar — desktop */}
        {(() => {
          const pageInfo = getPageInfo();
          const PageIcon = pageInfo.icon;
          return (
            <header className="hidden lg:flex items-center justify-between border-b border-atlas-border-subtle px-6 py-2.5 bg-atlas-bg">
              <div className="flex items-center gap-2.5 min-w-0">
                {PageIcon && (
                  <PageIcon strokeWidth={1.5} className="h-[18px] w-[18px] shrink-0 text-atlas-accent" />
                )}
                <span className="text-sm font-semibold text-atlas-text truncate">{pageInfo.title}</span>
                {pageInfo.subtitle && (
                  <>
                    <div className="h-4 w-px bg-atlas-border-subtle shrink-0" />
                    <span className="text-xs text-atlas-text-muted truncate hidden xl:inline">{pageInfo.subtitle}</span>
                  </>
                )}
              </div>
              <div className="flex items-center gap-3">
                {/* Theme toggle */}
                <button
                  onClick={toggleTheme}
                  className="atlas-tap rounded-lg p-2 text-atlas-text-muted hover:bg-atlas-surface-hover hover:text-atlas-text transition-all"
                  title={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
                >
                  <div className="relative h-[18px] w-[18px]">
                    <Moon className={cn("absolute inset-0 h-[18px] w-[18px] transition-all duration-300", theme === "light" ? "opacity-100 rotate-0 scale-100" : "opacity-0 rotate-90 scale-0")} />
                    <Sun className={cn("absolute inset-0 h-[18px] w-[18px] transition-all duration-300", theme === "dark" ? "opacity-100 rotate-0 scale-100" : "opacity-0 -rotate-90 scale-0")} />
                  </div>
                </button>
              </div>
            </header>
          );
        })()}

        {/* Mobile header bar */}
        <header className="flex items-center gap-3 border-b border-atlas-border-subtle bg-atlas-bg px-4 py-3 lg:hidden">
          <button
            onClick={() => setMobileOpen(true)}
            className="atlas-tap rounded-lg p-2 text-atlas-text hover:bg-atlas-surface-hover transition-colors"
          >
            <Menu className="h-5 w-5" />
          </button>
          <Link href="/dashboard/home" className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md overflow-hidden">
              <AtlasMark className="h-7 w-7" />
            </div>
            <span className="text-base font-semibold text-atlas-text">Algophony Studio</span>
          </Link>
          <div className="ml-auto flex items-center gap-2">
            <button onClick={toggleTheme} className="atlas-tap rounded-lg p-2 text-atlas-text-muted hover:text-atlas-text hover:bg-atlas-surface-hover transition-colors">
              {theme === "light" ? <Moon className="h-[18px] w-[18px]" /> : <Sun className="h-[18px] w-[18px]" />}
            </button>
          </div>
        </header>

        <main id="main-content" className="flex-1 overflow-auto pb-20">
          <ToastProvider>{children}</ToastProvider>
        </main>

        <CommandPalette />
        <FloatingComposerWidget />
      </div>
    </div>
    </GlobalAudioPlayerProvider>
    </FloatingComposerProvider>
  );
}

// Sidebar entry — separated out so the Sounds item can render an inline hover
// grid popover without leaking that state to siblings.
function SidebarItem({
  item,
  isActive,
  onNavigate,
  pathname,
  collapsed = false,
}: {
  item: {
    href: string;
    label: string;
    icon: typeof Waves;
    hoverGrid?: typeof DESIGN_ITEMS;
  };
  isActive: boolean;
  onNavigate: () => void;
  pathname: string;
  collapsed?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [popoverPos, setPopoverPos] = useState<{ top: number; left: number } | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const triggerRef = useRef<HTMLAnchorElement>(null);
  const Icon = item.icon;

  // Small open/close delay so brushing past the row doesn't flash the popover.
  const scheduleClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpen(false), 250);
  };
  const cancelClose = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };

  // Anchor the popover to the trigger's bounding rect. We render it through a
  // portal to <body> so the sidebar's `overflow-y-auto` scroll container
  // doesn't clip it — the previous `position: absolute` approach lived inside
  // that overflow context and ended up hidden behind page content.
  const openPopover = () => {
    cancelClose();
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) setPopoverPos({ top: rect.top, left: rect.right + 4 });
    setOpen(true);
  };

  if (item.hoverGrid) {
    return (
      <div onMouseEnter={openPopover} onMouseLeave={scheduleClose}>
        <Link
          ref={triggerRef}
          href={item.href}
          onClick={() => { setOpen(false); onNavigate(); }}
          title={collapsed ? item.label : undefined}
          className={cn(
            "group relative flex items-center rounded-lg text-sm font-medium transition-all duration-150",
            collapsed ? "justify-center px-2 py-2.5" : "gap-3 px-3 py-2.5",
            isActive
              ? "bg-atlas-accent-muted text-atlas-accent"
              : "text-atlas-text hover:bg-atlas-surface-hover"
          )}
        >
          {isActive && (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-full bg-atlas-accent animate-scale-in" />
          )}
          <Icon
            strokeWidth={1.5}
            className={cn("h-[18px] w-[18px] shrink-0 transition-colors", isActive ? "text-atlas-accent" : "text-atlas-text-muted group-hover:text-atlas-text")}
          />
          {!collapsed && <span className="flex-1">{item.label}</span>}
        </Link>

        {open && popoverPos && typeof window !== "undefined" && createPortal(
          <div
            style={{ top: popoverPos.top, left: popoverPos.left, position: "fixed" }}
            className="z-[200] w-[420px] rounded-xl border border-atlas-border bg-atlas-surface shadow-lg shadow-black/20 p-3 animate-fade-in"
            onMouseEnter={cancelClose}
            onMouseLeave={scheduleClose}
          >
            <div className="atlas-eyebrow px-1 pb-2">{item.label}</div>
            <div className="grid grid-cols-2 gap-1.5">
              {item.hoverGrid.map((d) => {
                const SubIcon = d.icon;
                const subActive = pathname === d.href;
                return (
                  <Link
                    key={d.href}
                    href={d.href}
                    onClick={() => { setOpen(false); onNavigate(); }}
                    className={cn(
                      "flex flex-col items-center gap-1.5 rounded-lg px-2 py-3 text-xs text-center transition-all",
                      subActive
                        ? "bg-atlas-accent-muted text-atlas-accent"
                        : "text-atlas-text hover:bg-atlas-surface-hover"
                    )}
                  >
                    <SubIcon
                      strokeWidth={1.5}
                      className={cn("h-5 w-5", subActive ? "text-atlas-accent" : "text-atlas-text-muted")}
                    />
                    <span className="leading-tight font-medium">{d.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>,
          document.body
        )}
      </div>
    );
  }

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      title={collapsed ? item.label : undefined}
      className={cn(
        "group relative flex items-center rounded-lg text-sm font-medium transition-all duration-150",
        collapsed ? "justify-center px-2 py-2.5" : "gap-3 px-3 py-2.5",
        isActive
          ? "bg-atlas-accent-muted text-atlas-accent"
          : "text-atlas-text hover:bg-atlas-surface-hover"
      )}
    >
      {isActive && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-full bg-atlas-accent animate-scale-in" />
      )}
      <Icon
        strokeWidth={1.5}
        className={cn("h-[18px] w-[18px] shrink-0 transition-colors", isActive ? "text-atlas-accent" : "text-atlas-text-muted group-hover:text-atlas-text")}
      />
      {!collapsed && <span className="flex-1">{item.label}</span>}
    </Link>
  );
}
