"use client";

import Link from "next/link";
import {
  Box,
  CircuitBoard,
  Cpu,
  FolderKanban,
  Headphones,
  Hexagon,
  Layers3,
  Radio,
  ScanSearch,
} from "lucide-react";
import { AtlasMark } from "@/app/dashboard/components/atlas-mark";

const PILLARS = [
  {
    icon: FolderKanban,
    label: "Local workspace",
    body: "A Algophony Studio project should live on your machine: folders, audio files, metadata, prompt cards, stacks, generated or rendered sounds, analysis caches, and exports.",
  },
  {
    icon: ScanSearch,
    label: "Library-aware",
    body: "Existing sounds are first-class material. Folder paths, filenames, tags, sidecars, transcripts, and listening notes can all become searchable metadata and prompts.",
  },
  {
    icon: Layers3,
    label: "Stack-based",
    body: "Imported, generated, rendered, and external sounds share the same stack, layer, tag, comparison, and export workflow.",
  },
  {
    icon: CircuitBoard,
    label: "Bring your own keys",
    body: "Generation, analysis, agents, and LLM use rely on user-configured providers. Algophony Studio should never depend on shared app keys or app-owned model credits.",
  },
];

const WORKFLOWS = [
  { name: "Local libraries", desc: "Register folders, scan audio files, preserve source paths, and attach tags without uploading a library to a hosted database." },
  { name: "Metadata to prompt", desc: "Use filename structure, BWF/iXML, ID3, Vorbis comments, JSON sidecars, notes, and analysis signals to draft prompt cards." },
  { name: "Sound to prompt", desc: "Listen to a reference, transcribe or tag events, then create prompt cards, descriptors, and stack-ready metadata." },
  { name: "Idea multiplication", desc: "Turn one reference into variants, related prompts, alternate layer roles, and exportable research rows." },
  { name: "Comparison", desc: "Compare a prompt, reference sound, generated take, and variant set using metadata overlap, annotations, and audio descriptors." },
  { name: "Stacking", desc: "Layer imported, generated, rendered, and external sounds into cue stacks with roles, timing, notes, export names, and source provenance." },
  { name: "Research exports", desc: "Create JSONL datasets, cue sheets, benchmark reports, agent-readable archives, DAW folders, and game-engine manifests." },
];

const FORMATS = [
  "WAV/BWF", "FLAC", "AIFF/AIF", "MP3", "M4A/AAC", "OGG", "CAF",
  "JSON/JSONL", "CSV/TSV", "BWF/iXML", "ID3/Vorbis", "Reaper RPP",
  "Wwise", "FMOD", "Unity", "Unreal",
];

export default function AboutPage() {
  return (
    <div className="p-6 max-w-4xl mx-auto animate-fade-in space-y-8">
      <section className="atlas-card p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center overflow-hidden">
            <AtlasMark className="h-11 w-11" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-atlas-text">About Algophony Studio</h1>
            <p className="text-xs text-atlas-text-dim">Sound ideas, organization, stacking, and listening research.</p>
          </div>
        </div>
        <p className="text-sm text-atlas-text-muted leading-relaxed">
          Algophony Studio is an open-source workspace for exploring sonic libraries. It is meant
          to combine existing folders of sounds with prompt cards, tags, metadata extraction,
          listening analysis, stacks, variants, comparisons, optional generative audio, and
          exportable research datasets.
        </p>
        <p className="text-sm text-atlas-text-muted leading-relaxed">
          The runtime uses local storage with bring-your-own keys for optional provider calls.
          The user configures any generation, analysis, agent, or LLM provider they want to use.
        </p>
      </section>

      <section>
        <span className="atlas-eyebrow mb-3 block">Product principles</span>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {PILLARS.map((p) => (
            <div key={p.label} className="atlas-card p-4 flex gap-3 items-start">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl shrink-0 border border-atlas-border-subtle bg-atlas-bg">
                <p.icon className="h-4 w-4 text-atlas-text" strokeWidth={1.5} />
              </div>
              <div className="min-w-0">
                <span className="block text-sm font-semibold text-atlas-text">{p.label}</span>
                <p className="text-xs text-atlas-text-muted mt-1 leading-relaxed">{p.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <span className="atlas-eyebrow mb-3 block flex items-center gap-1.5">
          <Radio className="h-3 w-3" /> Core workflows
        </span>
        <div className="atlas-card p-2 divide-y divide-atlas-border-subtle">
          {WORKFLOWS.map((item) => (
            <div key={item.name} className="flex items-baseline gap-3 px-3 py-2.5">
              <span className="text-sm font-semibold text-atlas-text w-40 shrink-0">{item.name}</span>
              <span className="text-xs text-atlas-text-muted leading-relaxed">{item.desc}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="atlas-card p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Headphones className="h-4 w-4 text-atlas-text" strokeWidth={1.5} />
          <span className="text-sm font-semibold text-atlas-text">Listening and evaluation</span>
        </div>
        <p className="text-sm text-atlas-text-muted leading-relaxed">
          Listening modes apply to existing files, generated files, rendered stacks, and external
          references. The goal is to annotate what a sound is doing, what prompt might describe it,
          how variants differ from a reference, and how a stack behaves as a composed layer system.
        </p>
      </section>

      <section>
        <span className="atlas-eyebrow mb-3 block flex items-center gap-1.5">
          <Cpu className="h-3 w-3" /> Target formats
        </span>
        <div className="atlas-card p-4 flex flex-wrap gap-2">
          {FORMATS.map((format) => (
            <span key={format} className="rounded-md border border-atlas-border-subtle bg-atlas-bg px-2 py-1 text-xs text-atlas-text-muted">
              {format}
            </span>
          ))}
        </div>
      </section>

      <section className="atlas-card p-5 space-y-2">
        <div className="flex items-center gap-2">
          <Hexagon className="h-4 w-4 text-atlas-text" strokeWidth={1.5} />
          <span className="text-sm font-semibold text-atlas-text">Use notes</span>
        </div>
        <p className="text-xs text-atlas-text-muted leading-relaxed">
          Algophony Studio can call third-party models only when you configure the provider yourself.
          Generated or analyzed audio should keep provenance metadata so it remains clear which
          sounds came from local libraries, model calls, rendered stacks, or exports.
        </p>
      </section>

      <div className="flex items-center justify-between text-xs text-atlas-text-dim pt-2">
        <span className="inline-flex items-center gap-1.5">
          <Box className="h-3.5 w-3.5" strokeWidth={1.5} /> Open-source release
        </span>
        <Link href="/dashboard" className="text-atlas-accent hover:underline inline-flex items-center gap-1">
          Back to workspace
        </Link>
      </div>
    </div>
  );
}
