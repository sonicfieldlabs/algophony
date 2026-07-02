"use client";

import { useMemo, useState } from "react";
import {
  BookOpen,
  Search,
  ChevronRight,
  FolderKanban,
  FileAudio,
  Tags,
  Headphones,
  Layers3,
  FlaskConical,
  KeyRound,
  Download,
  Database,
  AudioWaveform,
  FileJson,
  Send,
} from "lucide-react";
import { cn } from "@/lib/utils";

const TOC = [
  { id: "overview", label: "Overview" },
  { id: "workspace", label: "Local workspace" },
  { id: "libraries", label: "Local libraries" },
  { id: "providers", label: "BYOK providers" },
  { id: "listening", label: "Listening analysis" },
  { id: "stacking", label: "Stacking" },
  { id: "comparison", label: "Comparison" },
  { id: "exports", label: "Exports" },
  { id: "formats", label: "Formats" },
  { id: "glossary", label: "Glossary" },
];

const WORKSPACE_ROWS = [
  [".algophony-studio/local-db.json", "Local metadata database for assets, tags, prompts, stacks, comparisons, and exports."],
  [".algophony-studio/workspace.json", "Portable workspace manifest with project identity and registered library folders."],
  [".algophony-studio/provider-settings.json", "Local provider settings. Keys remain on the machine."],
  [".algophony-studio/storage", "Generated, copied, or derived audio stored inside the project when needed."],
  [".algophony-studio/cache", "Waveforms, descriptors, transcripts, and analysis caches."],
  [".algophony-studio/exports", "Archives, datasets, cue sheets, DAW folders, and manifests."],
];

const FORMAT_ROWS = [
  ["Audio", "WAV/BWF, FLAC, AIFF/AIF, MP3, M4A/AAC, OGG, CAF, WebM, MP4 audio"],
  ["Metadata", "BWF/iXML, ID3, Vorbis comments, sidecar JSON, JSONL, CSV, TSV"],
  ["DAW/game", "Reaper RPP, cue sheets, Wwise, FMOD, Unity, Unreal, custom manifests"],
  ["Research", "Dataset folders, split manifests, benchmark reports, prompt-pair JSONL"],
];

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-20">
      <h2 className="text-lg font-semibold text-atlas-text mb-4 flex items-center gap-2">
        <div className="h-1.5 w-1.5 rounded-full bg-atlas-accent" />
        {title}
      </h2>
      <div className="space-y-4 text-sm text-atlas-text-muted leading-relaxed">{children}</div>
    </section>
  );
}

function SubSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="atlas-card p-5">
      <h3 className="text-sm font-semibold text-atlas-text mb-2">{title}</h3>
      <div className="text-sm text-atlas-text-muted leading-relaxed space-y-2">{children}</div>
    </div>
  );
}

function ToolCard({ icon: Icon, name, desc }: { icon: React.ElementType; name: string; desc: string }) {
  return (
    <div className="atlas-card p-4 flex items-start gap-3">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-atlas-accent-muted shrink-0">
        <Icon className="h-4 w-4 text-atlas-accent" />
      </div>
      <div>
        <span className="text-sm font-medium text-atlas-text">{name}</span>
        <p className="text-xs text-atlas-text-muted mt-0.5">{desc}</p>
      </div>
    </div>
  );
}

function Definition({ term, def }: { term: string; def: string }) {
  return (
    <div className="flex gap-3 py-2 border-b border-atlas-border-subtle last:border-0">
      <span className="text-sm font-semibold text-atlas-accent shrink-0 w-40">{term}</span>
      <span className="text-sm text-atlas-text-muted">{def}</span>
    </div>
  );
}

export default function DocsPage() {
  const [search, setSearch] = useState("");
  const [activeSection, setActiveSection] = useState("overview");

  const filteredToc = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return TOC;
    return TOC.filter((item) => item.label.toLowerCase().includes(q));
  }, [search]);

  return (
    <div className="flex h-full">
      <aside className="hidden lg:flex w-56 shrink-0 flex-col border-r border-atlas-border-subtle bg-atlas-surface/50 p-4 sticky top-0 h-screen overflow-y-auto">
        <div className="flex items-center gap-2 mb-4">
          <BookOpen className="h-4 w-4 text-atlas-accent" />
          <span className="text-sm font-semibold text-atlas-text">Docs</span>
        </div>
        <div className="relative mb-3">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-atlas-text-dim" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search..."
            className="w-full rounded-lg border border-atlas-border-subtle bg-atlas-bg pl-8 pr-3 py-1.5 text-xs text-atlas-text placeholder-atlas-text-dim focus:border-atlas-accent focus:outline-none"
          />
        </div>
        <nav className="space-y-0.5">
          {filteredToc.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              onClick={() => setActiveSection(item.id)}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-colors",
                activeSection === item.id
                  ? "bg-atlas-accent-muted text-atlas-accent"
                  : "text-atlas-text-muted hover:bg-atlas-surface-hover hover:text-atlas-text"
              )}
            >
              <ChevronRight className={cn("h-3 w-3 transition-transform", activeSection === item.id && "rotate-90")} />
              {item.label}
            </a>
          ))}
        </nav>
      </aside>

      <main className="flex-1 overflow-y-auto p-6 max-w-4xl mx-auto space-y-10 animate-fade-in">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-atlas-accent-muted">
            <BookOpen className="h-5 w-5 text-atlas-accent" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-atlas-text">Algophony Studio documentation</h1>
            <p className="text-xs text-atlas-text-dim">Guide to the sound library and research workflow.</p>
          </div>
        </div>

        <Section id="overview" title="Overview">
          <SubSection title="What is Algophony Studio?">
            <p>
              Algophony Studio is a workspace for sound ideas, library organization,
              stacking, tagging, layering, listening, comparison, optional generation, and export.
              It is designed for sonic libraries: existing folders of sounds, metadata, tags,
              prompt cards, variants, stacks, generated sounds, and research datasets.
            </p>
            <p>
              The target workflow is <strong>Index - Organize - Prompt - Multiply - Compare - Stack - Export</strong>.
            </p>
          </SubSection>
          <SubSection title="Provider ownership">
            <p>
              Each workspace is local, and each user configures their own provider keys for any
              optional model calls they want to make.
            </p>
          </SubSection>
        </Section>

        <Section id="workspace" title="Local workspace">
          <div className="atlas-card p-5">
            <div className="space-y-2">
              {WORKSPACE_ROWS.map(([path, desc]) => (
                <div key={path} className="grid gap-2 border-b border-atlas-border-subtle pb-2 last:border-0 sm:grid-cols-[220px_1fr]">
                  <code className="text-xs text-atlas-text">{path}</code>
                  <span className="text-xs text-atlas-text-muted">{desc}</span>
                </div>
              ))}
            </div>
          </div>
        </Section>

        <Section id="libraries" title="Local libraries">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <ToolCard icon={FolderKanban} name="Folder registration" desc="Add local folders as library roots and keep original files in place by default." />
            <ToolCard icon={FileAudio} name="Asset index" desc="Track file paths, hashes, duration, sample rate, channels, and embedded metadata." />
            <ToolCard icon={Tags} name="Tagging" desc="Use manual tags, extracted tags, folder-derived tags, and agent-suggested tags together." />
            <ToolCard icon={Database} name="Promptable metadata" desc="Turn filenames, sidecars, notes, transcripts, and descriptors into prompt cards." />
          </div>
        </Section>

        <Section id="providers" title="BYOK providers">
          <SubSection title="No bundled model credentials">
            <p>
              Algophony Studio should call ElevenLabs, Gemini, LLMs, or agent services only when the
              local user configures their own provider account. Generated or analyzed audio is
              stored locally and linked to the prompt, provider, model, settings, and source
              references that produced it.
            </p>
          </SubSection>
          <SubSection title="Generation is one tool, not the whole app">
            <p>
              You can use Algophony Studio only as a metadata, tagging, comparison, stacking, and export
              workspace. Generation and agent workflows are optional BYOK features that should
              work alongside existing sound libraries.
            </p>
          </SubSection>
        </Section>

        <Section id="listening" title="Listening analysis">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <ToolCard icon={Headphones} name="Sound to prompt" desc="Analyze a reference sound and draft prompt cards from audible events and metadata." />
            <ToolCard icon={AudioWaveform} name="Descriptors" desc="Cache duration, loudness, spectral summaries, event tags, and waveform data." />
            <ToolCard icon={BookOpen} name="Listening notes" desc="Attach subjective research notes and evaluator comments to local, generated, or derived assets." />
            <ToolCard icon={FileJson} name="Prompt datasets" desc="Pair sounds with prompts, tags, and evaluation notes for downstream research." />
          </div>
        </Section>

        <Section id="stacking" title="Stacking">
          <SubSection title="Unified stack model">
            <p>
              A stack can contain local sounds, generated sounds, rendered audio, external references, timing metadata,
              layer roles, gain notes, prompt provenance, and export naming. Imported and generated
              assets should behave the same once they enter the library.
            </p>
          </SubSection>
        </Section>

        <Section id="comparison" title="Comparison">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <ToolCard icon={FlaskConical} name="Prompt to sound" desc="Compare a prompt target against a generated take and one or more references." />
            <ToolCard icon={Layers3} name="Sound to sound" desc="Compare local references, generated variants, rendered stacks, and layers using shared descriptors." />
          </div>
        </Section>

        <Section id="exports" title="Exports">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <ToolCard icon={Download} name="Dataset exports" desc="JSONL rows, dataset cards, split manifests, and benchmark result tables." />
            <ToolCard icon={Send} name="Production exports" desc="Cue sheets, DAW handoff folders, Reaper structures, and game-engine manifests." />
            <ToolCard icon={KeyRound} name="No secret exports" desc="Provider keys and local secrets are never included in backup or dataset exports." />
            <ToolCard icon={Database} name="Agent archives" desc="Markdown and JSON bundles that let another tool inspect prompts, tags, and sound provenance." />
          </div>
        </Section>

        <Section id="formats" title="Formats">
          <div className="atlas-card p-5">
            {FORMAT_ROWS.map(([label, desc]) => (
              <Definition key={label} term={label} def={desc} />
            ))}
          </div>
        </Section>

        <Section id="glossary" title="Glossary">
          <div className="atlas-card p-5">
            {[
              ["Local library", "A folder or set of folders indexed by Algophony Studio without uploading audio to a hosted service."],
              ["Sound asset", "A local, generated, or derived audio item with metadata, tags, provenance, and optional analysis descriptors."],
              ["Prompt card", "A structured prompt object connected to tags, references, exclusions, model settings, and generation history."],
              ["Stack", "A layered group of sound assets with roles, timing, notes, and export metadata."],
              ["Comparison", "A prompt, reference, generated take, or stack evaluation that records similarities, differences, and listening notes."],
              ["Dataset export", "A structured export for research, benchmarking, training preparation, or agent-readable analysis."],
            ].map(([term, def]) => (
              <Definition key={term} term={term} def={def} />
            ))}
          </div>
        </Section>

        <div className="text-center text-xs text-atlas-text-dim pb-8">
          Algophony Studio workspace.
        </div>
      </main>
    </div>
  );
}
