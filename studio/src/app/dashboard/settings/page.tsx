"use client";

import { Suspense } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Cpu, FolderKanban, KeyRound, Moon, Palette, Sun } from "lucide-react";
import { useTheme } from "@/app/ThemeProvider";
import { cn } from "@/lib/utils";
import { ModelsPanel } from "./ModelsPanel";
import { ProviderKeysPanel } from "./ProviderKeysPanel";
import { LocalLibraryPanel } from "./LocalLibraryPanel";

const TABS = [
  { id: "workspace", label: "Workspace", icon: FolderKanban },
  { id: "providers", label: "Providers", icon: KeyRound },
  { id: "theme", label: "Appearance", icon: Palette },
  { id: "models", label: "Models", icon: Cpu },
] as const;

type TabId = (typeof TABS)[number]["id"];

function isValidTab(v: string | null): v is TabId {
  return v === "workspace" || v === "providers" || v === "theme" || v === "models";
}

export default function SettingsPageWrapper() {
  return (
    <Suspense fallback={
      <div className="p-6 max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-9 w-9 rounded-xl bg-atlas-surface-hover animate-shimmer" />
          <div className="h-4 w-32 rounded bg-atlas-surface-hover animate-shimmer" />
        </div>
      </div>
    }>
      <SettingsContent />
    </Suspense>
  );
}

function SettingsContent() {
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const tab: TabId = isValidTab(tabParam) ? tabParam : "workspace";

  const setActiveTab = (nextTab: TabId) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", nextTab);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="p-6 max-w-5xl mx-auto animate-fade-in">
      <div className="flex gap-1 mb-6 border-b border-atlas-border-subtle pb-px">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 text-[13px] font-medium rounded-t-lg border-b-2 transition-all -mb-px",
                tab === t.id
                  ? "border-atlas-accent text-atlas-accent bg-atlas-accent-muted/30"
                  : "border-transparent text-atlas-text-dim hover:text-atlas-text"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === "workspace" && (
        <div className="atlas-card p-6 space-y-5">
          <div>
            <h2 className="text-sm font-semibold text-atlas-text flex items-center gap-2">
              <FolderKanban className="h-4 w-4 text-atlas-accent" />
              Local workspace
            </h2>
            <p className="text-sm text-atlas-text-muted mt-2 max-w-2xl leading-relaxed">
              Algophony Studio uses a project folder model where imported sounds, generated sounds, metadata, prompts, stacks, tags and exports share local state.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {[
              ["Workspace state", ".algophony-studio/"],
              ["Metadata index", ".algophony-studio/library.json"],
              ["Provider keys", ".algophony-studio/provider-settings.json"],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl border border-atlas-border-subtle bg-atlas-bg/60 p-4">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-atlas-text-dim">{label}</div>
                <div className="font-mono text-xs text-atlas-text mt-2 break-all">{value}</div>
              </div>
            ))}
          </div>

          <LocalLibraryPanel />

          <div className="rounded-xl border border-atlas-border-subtle bg-atlas-bg/60 p-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-atlas-text-dim mb-3">Local mode</div>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                "Local folder libraries are first-class sources for tagging, listening analysis and stacking.",
                "Generated sounds and imported sounds share tags, prompt metadata, provenance and export pipelines.",
                "Research exports target JSON, CSV, dataset manifests, Reaper-oriented helpers and batch audio folders.",
                "Workspace state stays local unless you intentionally export it.",
              ].map((item) => (
                <div key={item} className="text-sm text-atlas-text-muted leading-relaxed">
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === "providers" && <ProviderKeysPanel />}

      {tab === "theme" && (
        <div className="atlas-card p-6 space-y-5">
          <h2 className="text-sm font-semibold text-atlas-text flex items-center gap-2">
            <Palette className="h-4 w-4 text-atlas-accent" />
            Appearance
          </h2>
          <div className="grid grid-cols-2 gap-3 max-w-sm">
            {(["light", "dark"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTheme(t)}
                className={cn(
                  "atlas-card p-4 flex flex-col items-center gap-3 transition-all",
                  theme === t ? "ring-2 ring-atlas-accent border-atlas-accent" : "hover:border-atlas-border"
                )}
              >
                <div className={cn("flex h-12 w-12 items-center justify-center rounded-xl", t === "light" ? "bg-amber-50" : "bg-slate-800")}>
                  {t === "light" ? <Sun className="h-6 w-6 text-amber-500" /> : <Moon className="h-6 w-6 text-slate-300" />}
                </div>
                <span className="text-sm font-medium text-atlas-text capitalize">{t}</span>
                {theme === t && <span className="text-xs text-atlas-accent font-medium">Active</span>}
              </button>
            ))}
          </div>
        </div>
      )}

      {tab === "models" && <ModelsPanel />}
    </div>
  );
}
