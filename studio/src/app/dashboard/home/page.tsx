/**
 * Algophony Studio — Local workspace home
 *
 * Reachable by clicking the Algophony Studio logo / wordmark in the sidebar.
 * Server-rendered overview that gives a local workspace one place to:
 *   - check local workspace + provider status at a glance
 *   - resume recent local or generated assets
 *   - jump into any lab / tool without diving into the nav
 */

import Link from "next/link";
import { redirect } from "next/navigation";
import {
  AudioWaveform, Bug, Users, Footprints, CloudFog, Rocket, SlidersHorizontal, Hexagon,
  Orbit, Atom, Headphones, Aperture, FlaskConical, Layers3, ArrowDownToLine, Send, Settings,
  BookOpen, LifeBuoy, Activity, Sparkles, ArrowRight, Clock, KeyRound, FolderKanban,
} from "lucide-react";
import { getCurrentUser, getCurrentProfile } from "@/lib/auth/current-user";
import { listGenerations } from "@/lib/local/repositories/generations";
import { buildAutoName } from "@/lib/sfx/auto-name";
import { AtlasMark } from "@/app/dashboard/components/atlas-mark";
import { getElevenLabsKeyStatus } from "@/lib/local/provider-settings";

// Lab + tool quick-access definitions. Mirrors the sidebar nav but uses a
// looser tile layout — the home page is a *destination grid*, not a nav.
const LABS = [
  { href: "/dashboard/generate", icon: AudioWaveform, label: "Generic" },
  { href: "/dashboard/creature-lab", icon: Bug, label: "Non-human" },
  { href: "/dashboard/human-lab", icon: Users, label: "Human" },
  { href: "/dashboard/foley-room", icon: Footprints, label: "Foley" },
  { href: "/dashboard/atmosphere-builder", icon: CloudFog, label: "Atmosphere" },
  { href: "/dashboard/vehicle", icon: Rocket, label: "Vehicle" },
  { href: "/dashboard/ui-elements", icon: SlidersHorizontal, label: "UI Elements" },
  { href: "/dashboard/candy", icon: Hexagon, label: "Misc" },
];

const TOOLS = [
  { href: "/dashboard/chatsfx", icon: Orbit, label: "Agent" },
  { href: "/dashboard/library", icon: Atom, label: "Library" },
  { href: "/dashboard/listen", icon: Headphones, label: "Sound → Prompt" },
  { href: "/dashboard/image-to-sound", icon: Aperture, label: "Image → Sound" },
  { href: "/dashboard/variation-lab", icon: FlaskConical, label: "Variation Lab" },
  { href: "/dashboard/stacker", icon: Layers3, label: "Stacker" },
  { href: "/dashboard/import", icon: ArrowDownToLine, label: "Import" },
  { href: "/dashboard/export", icon: Send, label: "Export" },
];

// Cache off — server runs every request so provider status + recent gens stay fresh.
export const dynamic = "force-dynamic";

export default async function DashboardHomePage() {
  const [user, profile] = await Promise.all([getCurrentUser(), getCurrentProfile()]);

  // Defensive fallback: the local workspace identity should always be present.
  if (!user || !profile) redirect("/");

  // Best-effort recent generations — the home shouldn't fail just because the
  // generations table is empty / unreachable.
  let recent: Awaited<ReturnType<typeof listGenerations>>["rows"] = [];
  try {
    const result = await listGenerations(user.id, { limit: 5 });
    recent = result.rows.filter((r) => r.status === "succeeded" || r.status === "pending" || r.status === "generating");
  } catch {
    recent = [];
  }

  const providerStatus = getElevenLabsKeyStatus();

  // Cheap "next step" heuristic: surface a useful nudge based on the user's
  // recent activity rather than always showing the same call-to-action.
  const nextStep = (() => {
    if (recent.length === 0) {
      return {
        title: "Index your first local library",
        body: "Start by importing a local folder so Algophony Studio can attach metadata, tags, prompt candidates, and provenance.",
        href: "/dashboard/import",
        cta: "Open Import",
      };
    }
    if (recent.length < 3) {
      return {
        title: "Compare prompts against material",
        body: "Use listening and variation tools to turn existing sounds into prompts, then compare variants against the reference material.",
        href: "/dashboard/design",
        cta: "Browse Labs",
      };
    }
    return {
      title: "Build a sound stack",
      body: "Layer imported, generated, rendered, or external sounds into stacks with shared tags, notes, and export metadata.",
      href: "/dashboard/stacker",
      cta: "Open Stacker",
    };
  })();

  const isMockMode = process.env.MOCK_ELEVENLABS === "true";
  const statusPills = [
    {
      icon: Activity,
      label: isMockMode ? "Mock provider calls" : "Provider calls",
      tone: isMockMode ? "warn" : "ok",
      detail: isMockMode ? "Model calls are mocked" : "Live user-owned providers",
    },
    {
      icon: FolderKanban,
      label: "Local workspace",
      tone: "ok",
      detail: ".algophony-studio bridge active",
    },
    {
      icon: KeyRound,
      label: providerStatus.configured ? "Key configured" : "Key missing",
      tone: providerStatus.configured ? "ok" : "danger",
      detail: providerStatus.configured ? `ElevenLabs ${providerStatus.keyHint}` : "Add your own key",
    },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto animate-fade-in space-y-8">
      {/* ── Hero — workspace identity + local status ─────────────────── */}
      <section className="atlas-card p-6 sm:p-8 relative overflow-hidden">
        {/* Subtle orbital backdrop using the AtlasMark itself. */}
        <AtlasMark className="absolute -right-12 -bottom-16 h-72 w-72 opacity-[0.06] pointer-events-none" />

        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-atlas-text-dim mb-3">
              <Sparkles className="h-3 w-3" /> Workspace
            </div>
            <h1 className="text-2xl sm:text-3xl font-semibold text-atlas-text tracking-tight">
              Local sound research workspace.
            </h1>
            <p className="text-sm text-atlas-text-muted mt-2 max-w-lg leading-relaxed">
              Stack, organize, tag, multiply, and evaluate sounds from a local project folder.
            </p>
          </div>

          <div className="atlas-card border-atlas-border-subtle bg-atlas-bg/50 backdrop-blur-sm w-full md:w-72 p-4 shrink-0">
            <div className="flex items-center justify-between mb-3">
              <span className="atlas-eyebrow">Workspace</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-atlas-accent">
                local
              </span>
            </div>
            <div className="space-y-2 text-xs text-atlas-text-muted">
              <div className="flex items-center justify-between gap-3">
                <span>State</span>
                <span className="font-mono text-atlas-text">.algophony-studio/</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>Provider key</span>
                <span className="font-mono text-atlas-text">{providerStatus.keyHint ?? "missing"}</span>
              </div>
            </div>
            <div className="flex items-center justify-between text-[11px] text-atlas-text-dim">
              <span>Imported, generated, and derived sounds share metadata</span>
              <Link href="/dashboard/settings?tab=providers" className="text-atlas-accent hover:underline">
                Providers
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Status pills ──────────────────────────────────────────────── */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {statusPills.map((pill) => {
          const Icon = pill.icon;
          const toneClass =
            pill.tone === "ok" ? "text-atlas-success" :
            pill.tone === "warn" ? "text-atlas-warning" :
            "text-atlas-danger";
          return (
            <div key={pill.label} className="atlas-card p-3 flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-atlas-border-subtle bg-atlas-bg shrink-0">
                <Icon className={`h-4 w-4 ${toneClass}`} strokeWidth={1.5} />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-atlas-text leading-none">{pill.label}</div>
                <div className="text-[11px] text-atlas-text-dim mt-1 leading-none">{pill.detail}</div>
              </div>
            </div>
          );
        })}
      </section>

      {/* ── Next-step nudge ──────────────────────────────────────────── */}
      <section className="atlas-card p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-atlas-accent/30">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <ArrowRight className="h-3.5 w-3.5 text-atlas-accent" />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-atlas-accent">Next step</span>
          </div>
          <h3 className="text-base font-semibold text-atlas-text">{nextStep.title}</h3>
          <p className="text-sm text-atlas-text-muted leading-relaxed mt-1">{nextStep.body}</p>
        </div>
        <Link
          href={nextStep.href}
          className="inline-flex items-center gap-2 rounded-xl bg-atlas-accent px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-atlas-accent-hover hover:shadow-md hover:shadow-atlas-accent/20 active:scale-[0.99] shrink-0"
        >
          {nextStep.cta}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </section>

      {/* ── Labs grid ─────────────────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <span className="atlas-eyebrow">Design — labs</span>
          <Link href="/dashboard/design" className="text-xs text-atlas-text-muted hover:text-atlas-text transition-colors inline-flex items-center gap-1">
            All labs <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-2">
          {LABS.map((lab) => {
            const Icon = lab.icon;
            return (
              <Link
                key={lab.href}
                href={lab.href}
                className="atlas-card flex flex-col items-center gap-2 py-3.5 px-2 hover:border-atlas-accent/40 hover:shadow-sm transition-all group"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-atlas-bg border border-atlas-border-subtle group-hover:border-atlas-accent/40 transition-colors">
                  <Icon className="h-4 w-4 text-atlas-text-muted group-hover:text-atlas-accent transition-colors" strokeWidth={1.5} />
                </div>
                <span className="text-[11px] font-medium text-atlas-text leading-none text-center truncate w-full">{lab.label}</span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ── Tools grid ────────────────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <span className="atlas-eyebrow">Tools</span>
          <Link href="/dashboard/tools" className="text-xs text-atlas-text-muted hover:text-atlas-text transition-colors inline-flex items-center gap-1">
            All tools <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
          {TOOLS.map((tool) => {
            const Icon = tool.icon;
            return (
              <Link
                key={tool.href}
                href={tool.href}
                className="atlas-card flex flex-col items-center gap-2 py-3.5 px-2 hover:border-atlas-accent/40 hover:shadow-sm transition-all group"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-atlas-bg border border-atlas-border-subtle group-hover:border-atlas-accent/40 transition-colors">
                  <Icon className="h-4 w-4 text-atlas-text-muted group-hover:text-atlas-accent transition-colors" strokeWidth={1.5} />
                </div>
                <span className="text-[11px] font-medium text-atlas-text leading-none text-center truncate w-full">{tool.label}</span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ── Recent generated assets ─────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <span className="atlas-eyebrow">Recent generated assets</span>
          <Link href="/dashboard/library?tab=sounds" className="text-xs text-atlas-text-muted hover:text-atlas-text transition-colors inline-flex items-center gap-1">
            Open library <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {recent.length === 0 ? (
          <div className="atlas-card p-8 text-center">
            <AudioWaveform className="h-8 w-8 mx-auto text-atlas-text-dim mb-3" strokeWidth={1.5} />
            <p className="text-sm text-atlas-text-muted">No generated assets yet. Local libraries and stack work can start without provider keys.</p>
            <Link
              href="/dashboard/generate"
              className="inline-flex items-center gap-1.5 mt-4 text-xs font-semibold text-atlas-accent hover:underline"
            >
              Open prompt lab <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        ) : (
          <div className="atlas-card divide-y divide-atlas-border-subtle">
            {recent.map((row) => {
              const prompt = String((row.request_payload as { text?: unknown } | null)?.text ?? "");
              const shortName = prompt
                ? buildAutoName({ prompt, category: "sfx" }).displayName
                : `sfx_${row.id.slice(0, 4)}`;
              const ts = new Date(row.created_at);
              const ago = formatRelative(ts);
              const isSucceeded = row.status === "succeeded";
              return (
                <Link
                  key={row.id}
                  href={`/dashboard/library?tab=sounds`}
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-atlas-surface-hover/40 transition-colors group"
                  title={prompt || undefined}
                >
                  <span
                    className={`h-2 w-2 rounded-full shrink-0 ${
                      isSucceeded ? "bg-atlas-success" : row.status === "failed" ? "bg-atlas-danger" : "bg-atlas-warning animate-pulse"
                    }`}
                  />
                  <span className="text-xs text-atlas-text truncate flex-1">{shortName}</span>
                  <span className="text-[10px] uppercase tracking-wider text-atlas-text-dim rounded bg-atlas-surface-hover px-1.5 py-0.5 shrink-0">
                    {row.api_route || "sfx"}
                  </span>
                  <span className="flex items-center gap-1 text-[11px] text-atlas-text-dim shrink-0 tabular-nums">
                    <Clock className="h-3 w-3" /> {ago}
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Useful pointers ──────────────────────────────────────────── */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Link href="/dashboard/docs" className="atlas-card p-4 flex items-start gap-3 hover:border-atlas-accent/30 transition-colors group">
          <BookOpen className="h-4 w-4 text-atlas-text-muted group-hover:text-atlas-accent transition-colors mt-0.5" strokeWidth={1.5} />
          <div className="min-w-0">
            <span className="text-sm font-semibold text-atlas-text block">Docs</span>
            <p className="text-xs text-atlas-text-muted leading-relaxed mt-0.5">
              Local libraries, metadata prompts, listening research, stacking and exports.
            </p>
          </div>
        </Link>
        <Link href="/dashboard/settings?tab=providers" className="atlas-card p-4 flex items-start gap-3 hover:border-atlas-accent/30 transition-colors group">
          <Settings className="h-4 w-4 text-atlas-text-muted group-hover:text-atlas-accent transition-colors mt-0.5" strokeWidth={1.5} />
          <div className="min-w-0">
            <span className="text-sm font-semibold text-atlas-text block">Settings</span>
            <p className="text-xs text-atlas-text-muted leading-relaxed mt-0.5">
              Provider keys, local workspace notes, appearance and model preferences.
            </p>
          </div>
        </Link>
        <Link href="/dashboard/support" className="atlas-card p-4 flex items-start gap-3 hover:border-atlas-accent/30 transition-colors group">
          <LifeBuoy className="h-4 w-4 text-atlas-text-muted group-hover:text-atlas-accent transition-colors mt-0.5" strokeWidth={1.5} />
          <div className="min-w-0">
            <span className="text-sm font-semibold text-atlas-text block">Support</span>
            <p className="text-xs text-atlas-text-muted leading-relaxed mt-0.5">
              Report bugs, local-library issues or research workflow requests.
            </p>
          </div>
        </Link>
      </section>
    </div>
  );
}

/** Tiny relative-time formatter — no external deps. */
function formatRelative(ts: Date): string {
  const diffMs = Date.now() - ts.getTime();
  const sec = Math.floor(diffMs / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  return ts.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
