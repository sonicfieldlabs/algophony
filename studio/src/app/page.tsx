"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import {
  ArrowRight, Sun, Moon, Radio, Cpu, Atom, Orbit,
  Footprints, CloudFog, Users, Bug, SlidersHorizontal,
  AudioWaveform, Hexagon, Rocket, FlaskConical,
  Headphones, Aperture, Layers3, Send,
  Sparkles, Zap, Package, Music, Shield,
} from "lucide-react";
import { useTheme } from "@/app/ThemeProvider";
import { AtlasMark } from "@/app/dashboard/components/atlas-mark";

// ── Content data ────────────────────────────────────────────────────────

const LABS = [
  { icon: AudioWaveform, name: "Prompt lab", line: "Shape prompt cards, references, and optional provider calls." },
  { icon: Bug, name: "Creature", line: "Non-human voices, bodies, textures, breaths." },
  { icon: Users, name: "Human", line: "Breath, effort, crowds, expressions, dialogue cues." },
  { icon: Footprints, name: "Foley", line: "Body, surface, material, contact, perspective." },
  { icon: CloudFog, name: "Atmosphere", line: "Layered ambiences, room tones, environmental beds." },
  { icon: Rocket, name: "Vehicle", line: "Engines, jets, tires, passes, propulsion layers." },
  { icon: SlidersHorizontal, name: "Interface", line: "Clicks, alerts, transitions, chimes, product sounds." },
  { icon: Hexagon, name: "Texture", line: "Whooshes, impacts, noise, artifacts, hybrid materials." },
];

const TOOLS = [
  { icon: Atom, name: "Local libraries", line: "Index folders, preserve paths, tag sounds in place." },
  { icon: Headphones, name: "Sound to prompt", line: "Extract metadata and listening notes into prompt cards." },
  { icon: Orbit, name: "Agent", line: "Interpret libraries, tags, prompts, stacks, and metadata." },
  { icon: Aperture, name: "Image to sound", line: "Convert visual scenes into sound layers." },
  { icon: FlaskConical, name: "Comparison lab", line: "Compare prompts, references, generations, and variants." },
  { icon: Layers3, name: "Stacker", line: "Layer imported and generated sounds together." },
  { icon: Music, name: "Listening research", line: "Modes for analysis, annotation, and benchmark notes." },
  { icon: Send, name: "Export", line: "Datasets, cue sheets, DAW packs, game manifests, archives." },
];

const SECTIONS = [
  {
    icon: Package,
    title: "Local libraries become research material.",
    body: "Point Algophony Studio at folders of existing sounds, keep files local, extract metadata, add tags, and turn library context into promptable sonic knowledge.",
  },
  {
    icon: Sparkles,
    title: "Multiply ideas with your own provider keys.",
    body: "Use generative audio or model analysis only when it helps. There is no shared app key; model calls use accounts you configure yourself.",
  },
  {
    icon: Orbit,
    title: "Metadata can become prompts.",
    body: "Filename patterns, folder structure, tags, analysis, transcripts, and listening notes can be translated into prompt cards and comparison tasks.",
  },
  {
    icon: Shield,
    title: "Exports for making and studying sound.",
    body: "Create sound stacks, cue sheets, JSONL datasets, benchmark reports, DAW handoff packs, and game audio manifests from imported and generated assets.",
  },
];

const DEMO_STEPS = [
  "Index a local folder.",
  "Extract tags and metadata.",
  "Create prompts from references.",
  "Multiply ideas with BYOK tools.",
  "Compare, stack, and annotate.",
  "Export a dataset or DAW pack.",
];

const FEEL_LINES = [
  "Local folders, sonic ideas, one research workspace.",
  "Tags. Layers. Prompt cards. Comparisons. Exports.",
  "Bring your own keys only when model calls are useful.",
  "From metadata to prompts to stacks and variants.",
  "A tool for sonic libraries, datasets, and listening research.",
];

export default function LandingPage() {
  const { theme, toggleTheme } = useTheme();
  const [feelIndex, setFeelIndex] = useState(0);
  const [demoStep, setDemoStep] = useState(0);
  const [visible, setVisible] = useState<Set<string>>(new Set());
  const observers = useRef<IntersectionObserver[]>([]);

  useEffect(() => {
    const id = window.setInterval(() => {
      setFeelIndex((i) => (i + 1) % FEEL_LINES.length);
    }, 3200);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => {
      setDemoStep((i) => (i + 1) % DEMO_STEPS.length);
    }, 2400);
    return () => window.clearInterval(id);
  }, []);

  // Scroll-reveal
  useEffect(() => {
    const sections = document.querySelectorAll("[data-reveal]");
    // Capture the array reference at effect setup so the cleanup function
    // uses the same list of observers — the eslint-react-hooks rule warns
    // that observers.current may have changed by the time cleanup fires.
    const created: IntersectionObserver[] = [];
    sections.forEach((el) => {
      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setVisible((prev) => new Set(prev).add(el.getAttribute("data-reveal") ?? ""));
            obs.disconnect();
          }
        },
        { threshold: 0.15 }
      );
      obs.observe(el);
      created.push(obs);
      observers.current.push(obs);
    });
    return () => created.forEach((o) => o.disconnect());
  }, []);

  const revealed = (id: string) =>
    visible.has(id)
      ? "opacity-100 translate-y-0"
      : "opacity-0 translate-y-6";

  return (
    <div className="min-h-screen bg-atlas-bg">
      {/* ── Top nav ── */}
      <nav className="glass border-b border-atlas-border-subtle sticky top-0 z-50">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center overflow-hidden">
              <AtlasMark className="h-9 w-9" />
            </div>
            <span className="text-base font-semibold text-atlas-text">Algophony Studio</span>
          </Link>
          <div className="flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className="rounded-lg p-2 text-atlas-text-dim hover:text-atlas-text hover:bg-atlas-surface-hover transition-colors"
              aria-label="Toggle theme"
            >
              {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </button>
            <Link
              href="/dashboard/home"
              className="text-sm text-atlas-text-muted transition-colors hover:text-atlas-text"
            >
              Workspace
            </Link>
            <Link
              href="/dashboard/home"
              className="rounded-lg bg-atlas-accent px-4 py-2 text-sm font-medium text-white transition-all hover:bg-atlas-accent-hover hover:shadow-md hover:shadow-atlas-accent/20"
            >
              Get started
            </Link>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-7xl px-6 pt-20 pb-28">
        {/* ── Hero ──────────────────────────────────────────────────── */}
        <section className="grid lg:grid-cols-2 gap-10 items-center mb-28">
          <div className="animate-slide-up">
            <div className="inline-flex items-center gap-2 rounded-full bg-atlas-accent-muted px-3 py-1 text-[11px] font-medium text-atlas-accent mb-6">
              <Sparkles className="h-3 w-3" />
              Open-source sound research
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-atlas-text leading-[1.05] mb-5">
              Stack, organize,
              <br />
              and multiply sounds
              <br />
              <span className="text-gradient-accent">on your machine.</span>
            </h1>
            <p className="text-base text-atlas-text-muted leading-relaxed max-w-lg mb-8">
              Algophony Studio is a workspace for sonic libraries. Index folders,
              extract metadata, turn existing sounds into prompts, build stacks and variants,
              call models with your own keys when useful, and export research-ready sound sets.
            </p>
            <div className="flex items-center gap-3">
              <Link
                href="/dashboard/home"
                className="inline-flex items-center gap-2 rounded-xl bg-atlas-accent px-5 py-3 text-sm font-semibold text-white transition-all hover:bg-atlas-accent-hover hover:shadow-lg hover:shadow-atlas-accent/20 active:scale-[0.99]"
              >
                Open local workspace
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/dashboard/docs"
                className="inline-flex items-center gap-2 rounded-xl border border-atlas-border px-5 py-3 text-sm font-medium text-atlas-text-muted hover:border-atlas-accent hover:text-atlas-accent transition-colors"
              >
                Read the docs
              </Link>
            </div>
          </div>

          {/* Identity tile with rotating statements */}
          <div className="relative animate-fade-in" style={{ animationDelay: "200ms" }}>
            <div className="aspect-square max-w-md mx-auto rounded-3xl bg-gradient-to-br from-atlas-accent/10 via-transparent to-atlas-accent/5 border border-atlas-border-subtle p-10 flex flex-col items-center justify-center">
              <AtlasMark className="h-44 w-44 rounded-2xl animate-breathe" />
              <div className="mt-8 text-center min-h-[2.5rem]">
                <p
                  key={feelIndex}
                  className="text-sm text-atlas-text-muted animate-fade-in"
                >
                  {FEEL_LINES[feelIndex]}
                </p>
              </div>
              <div className="mt-3 flex items-center gap-1">
                {FEEL_LINES.map((_, i) => (
                  <span
                    key={i}
                    className={`h-1 rounded-full transition-all duration-500 ${
                      i === feelIndex ? "w-6 bg-atlas-accent" : "w-1 bg-atlas-border"
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── Demo flow — animated step ticker ─────────────────────── */}
        <section
          data-reveal="demo"
          className={`mb-24 transition-all duration-700 ease-out ${revealed("demo")}`}
        >
          <div className="text-center max-w-2xl mx-auto mb-10">
              <p className="text-xs font-semibold uppercase tracking-widest text-atlas-accent mb-3">How it works</p>
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-atlas-text mb-4">
              What if your sound folder could become a promptable research database?
              </h2>
          </div>
          <div className="flex items-center justify-center gap-2 flex-wrap">
            {DEMO_STEPS.map((step, i) => (
              <div
                key={i}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-500 ${
                  i === demoStep
                    ? "bg-atlas-accent text-white scale-105 shadow-md shadow-atlas-accent/20"
                    : i < demoStep
                      ? "bg-atlas-surface-hover text-atlas-text-muted"
                      : "bg-atlas-bg text-atlas-text-dim border border-atlas-border-subtle"
                }`}
              >
                <span className="text-[10px] font-bold tabular-nums opacity-60">{String(i + 1).padStart(2, "0")}</span>
                {step}
              </div>
            ))}
          </div>
        </section>

        {/* ── Narrative sections ───────────────────────────────────── */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-24">
          {SECTIONS.map((s, i) => {
            const Icon = s.icon;
            const id = `section-${i}`;
            return (
              <div
                key={i}
                data-reveal={id}
                className={`atlas-card p-6 transition-all duration-700 ease-out ${revealed(id)}`}
                style={{ transitionDelay: `${i * 100}ms` }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <Icon className="h-4 w-4 text-atlas-accent" strokeWidth={1.5} />
                  <span className="text-xs font-semibold uppercase tracking-wider text-atlas-accent">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-atlas-text mb-2">{s.title}</h3>
                <p className="text-sm text-atlas-text-muted leading-relaxed">{s.body}</p>
              </div>
            );
          })}
        </section>

        {/* ── Labs ─────────────────────────────────────────────────── */}
        <section
          id="tour"
          className="mb-24 scroll-mt-20"
          data-reveal="labs"
        >
          <div className={`transition-all duration-700 ease-out ${revealed("labs")}`}>
            <div className="flex items-center gap-3 mb-6">
              <Radio className="h-4 w-4 text-atlas-accent" />
              <span className="atlas-eyebrow">Sound labs - specialized environments for each sound family</span>
            </div>
            <p className="text-sm text-atlas-text-muted leading-relaxed max-w-2xl mb-8">
              Each lab can work with existing local files, generated assets, rendered layers, or
              external references. The point is reusable sonic knowledge from references, tags,
              metadata, prompts, variations, and listening notes.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3" data-stagger>
              {LABS.map((lab) => {
                const Icon = lab.icon;
                return (
                  <div
                    key={lab.name}
                    className="atlas-card p-4 flex items-start gap-3 hover:border-atlas-accent/30 transition-colors"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-atlas-border-subtle bg-atlas-bg shrink-0">
                      <Icon className="h-4 w-4 text-atlas-text" strokeWidth={1.5} />
                    </div>
                    <div className="min-w-0">
                      <span className="block text-sm font-semibold text-atlas-text">{lab.name}</span>
                      <p className="text-xs text-atlas-text-muted leading-relaxed mt-0.5">{lab.line}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── Tools ────────────────────────────────────────────────── */}
        <section
          className="mb-24"
          data-reveal="tools"
        >
          <div className={`transition-all duration-700 ease-out ${revealed("tools")}`}>
            <div className="flex items-center gap-3 mb-6">
              <Cpu className="h-4 w-4 text-atlas-accent" />
              <span className="atlas-eyebrow">Tools - workflows for libraries, stacks, and datasets</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3" data-stagger>
              {TOOLS.map((tool) => {
                const Icon = tool.icon;
                return (
                  <div
                    key={tool.name}
                    className="atlas-card p-4 flex flex-col gap-2 hover:border-atlas-accent/30 transition-colors"
                  >
                    <Icon className="h-4 w-4 text-atlas-text-muted" strokeWidth={1.5} />
                    <span className="text-sm font-semibold text-atlas-text">{tool.name}</span>
                    <p className="text-xs text-atlas-text-muted leading-relaxed">{tool.line}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── Bring your own keys ────────────────────────────────── */}
        <section
          className="mb-24"
          data-reveal="elevenlabs"
        >
          <div className={`atlas-card p-6 md:p-8 text-center transition-all duration-700 ease-out ${revealed("elevenlabs")}`}>
            <Zap className="h-5 w-5 text-atlas-accent mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-atlas-text mb-2">Bring your own model keys.</h3>
            <p className="text-sm text-atlas-text-muted leading-relaxed max-w-xl mx-auto">
              Algophony Studio does not include shared ElevenLabs, Gemini, LLM, or agent credentials.
              Configure providers locally, use your own accounts, and keep generated or analyzed
              assets inside your project library.
            </p>
          </div>
        </section>

        {/* ── Final CTA ───────────────────────────────────────────── */}
        <section className="text-center max-w-2xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-atlas-text mb-3">
            Ready to turn a local library into a sound research workspace?
          </h2>
          <p className="text-sm text-atlas-text-muted leading-relaxed mb-7">
            Open a local workspace, index sounds you already have, organize and multiply ideas,
            then export the result for creative or research workflows.
          </p>
          <Link
            href="/dashboard/home"
            className="inline-flex items-center gap-2 rounded-xl bg-atlas-accent px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-atlas-accent-hover hover:shadow-lg hover:shadow-atlas-accent/20 active:scale-[0.99]"
          >
            Open local workspace
            <ArrowRight className="h-4 w-4" />
          </Link>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-atlas-border-subtle">
        <div className="mx-auto max-w-7xl px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-md overflow-hidden">
              <AtlasMark className="h-7 w-7" />
            </div>
            <span className="text-xs text-atlas-text-muted">
              Algophony Studio - open-source tools for sound stacking and research.
            </span>
          </div>
          <div className="flex items-center gap-5 text-xs text-atlas-text-muted">
            <Link href="/dashboard/eula" className="hover:text-atlas-text transition-colors">Local use notes</Link>
            <Link href="/dashboard/support" className="hover:text-atlas-text transition-colors">Feedback</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
