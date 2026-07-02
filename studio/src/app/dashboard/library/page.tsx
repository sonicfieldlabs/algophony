"use client";

/**
 * Algophony Studio — Library
 *
 * A single Workspace surface that bundles Recipes / Sounds / Tags / Projects
 * behind a tab switcher. The underlying routes (/dashboard/sounds, …) still
 * exist as deep-link destinations; this page imports their default exports
 * and renders them inline so the user gets one cohesive Library view.
 */

import { Suspense, useCallback, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ScrollText, FileAudio, FolderKanban, Tags as TagsIcon,
  CheckCircle2, XCircle, Zap, Type, Star, ThumbsDown,
  Database,
} from "lucide-react";
import { cn } from "@/lib/utils";

import RecipesPage from "../recipes/page";
import SoundsPage from "../sounds/page";
import TagsPage from "../tags/page";
import ProjectsPage from "../projects/page";
import { LocalLibraryWorkspace } from "./LocalLibraryWorkspace";

const TABS = [
  { id: "local", label: "Local", icon: Database },
  { id: "sounds", label: "Sounds", icon: FileAudio },
  { id: "recipes", label: "Recipes", icon: ScrollText },
  { id: "tags", label: "Tags", icon: TagsIcon },
  { id: "projects", label: "Projects", icon: FolderKanban },
] as const;

type TabId = (typeof TABS)[number]["id"];

interface SoundsStats {
  succeededCount: number;
  failedCount: number;
  totalCredits: number;
  totalChars: number;
  favoriteCount: number;
  rejectedCount: number;
  loading: boolean;
}

// ── Compact stat pill (shared with sounds page) ──────────────

function StatPill({ icon: Icon, value, label, color }: {
  icon: typeof Star;
  value: string | number;
  label: string;
  color: string;
}) {
  return (
    <div className="flex items-center gap-1 text-[11px] text-atlas-text-muted" title={label}>
      <Icon className={cn("h-3 w-3", color)} strokeWidth={1.5} />
      <span className="font-semibold tabular-nums text-atlas-text">{value}</span>
      <span className="hidden lg:inline">{label}</span>
    </div>
  );
}

export default function LibraryPage() {
  return (
    <Suspense fallback={<LibraryShellFallback />}>
      <LibraryInner />
    </Suspense>
  );
}

function LibraryShellFallback() {
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex gap-0.5 justify-center py-12">
        {[...Array(5)].map((_, i) => (<span key={i} className="waveform-bar" />))}
      </div>
    </div>
  );
}

function LibraryInner() {
  const params = useSearchParams();
  const router = useRouter();
  const tab = (params.get("tab") as TabId | null) ?? "local";
  const isValid = TABS.some((t) => t.id === tab);
  const activeTab: TabId = isValid ? tab : "local";

  const changeTab = useCallback(
    (id: TabId) => {
      router.replace(`/dashboard/library?tab=${id}`, { scroll: false });
    },
    [router]
  );

  // Listen for stats dispatched by SoundsPage
  const [stats, setStats] = useState<SoundsStats | null>(null);
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<SoundsStats>).detail;
      setStats(detail);
    };
    window.addEventListener("algophony-studio:sounds:stats", handler);
    return () => window.removeEventListener("algophony-studio:sounds:stats", handler);
  }, []);

  return (
    <div className="animate-fade-in">
      {/* Library tabs + stats */}
      <div className="border-b border-atlas-border-subtle bg-atlas-bg sticky top-0 z-10">
        <div className="max-w-[1600px] mx-auto px-6 pt-3 pb-2">
          <div className="flex items-center gap-1">
            {/* Tabs */}
            <div role="tablist" className="flex gap-1 overflow-x-auto">
              {TABS.map((t) => {
                const Icon = t.icon;
                const isActive = activeTab === t.id;
                return (
                  <button
                    key={t.id}
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => changeTab(t.id)}
                    className={cn(
                      "relative flex items-center gap-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors",
                      isActive
                        ? "text-atlas-accent"
                        : "text-atlas-text-muted hover:text-atlas-text"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {t.label}
                    {isActive && (
                      <span className="absolute inset-x-2 bottom-0 h-[2px] rounded-t-full bg-atlas-accent" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Stats — shown on the right side of the tab bar when sounds tab is active */}
            {activeTab === "sounds" && stats && !stats.loading && (
              <div className="ml-auto flex items-center gap-3 pl-4">
                <StatPill icon={FileAudio} value={stats.succeededCount} label="generated" color="text-atlas-accent" />
                <StatPill icon={CheckCircle2} value={stats.succeededCount} label="ok" color="text-atlas-success" />
                <StatPill icon={XCircle} value={stats.failedCount} label="failed" color="text-atlas-danger" />
                <div className="h-3 w-px bg-atlas-border-subtle" />
                <StatPill icon={Zap} value={stats.totalCredits} label="calls" color="text-atlas-accent" />
                <StatPill icon={Type} value={stats.totalChars.toLocaleString()} label="chars" color="text-atlas-text-muted" />
                <div className="h-3 w-px bg-atlas-border-subtle" />
                <StatPill icon={Star} value={stats.favoriteCount} label="fav" color="text-green-400" />
                <StatPill icon={ThumbsDown} value={stats.rejectedCount} label="rej" color="text-red-400" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tab content */}
      <div className="max-w-[1600px] mx-auto">
        {activeTab === "local" && <LocalLibraryWorkspace />}
        {activeTab === "recipes" && <RecipesPage />}
        {activeTab === "sounds" && <SoundsPage />}
        {activeTab === "tags" && <TagsPage />}
        {activeTab === "projects" && <ProjectsPage />}
      </div>
    </div>
  );
}
