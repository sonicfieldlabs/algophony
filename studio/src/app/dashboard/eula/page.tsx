"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

const LAST_UPDATED = "May 2026";

const SECTIONS: { title: string; body: string[] }[] = [
  {
    title: "1. Local workspace intent",
    body: [
      "Algophony Studio is an open-source sound research and design tool. The app stores project metadata, indexed sounds, generated or derived sounds, provider settings, analysis caches, and exports on the user's machine.",
      "The local runtime is designed for personal workspaces that can be copied, inspected, and shared intentionally.",
    ],
  },
  {
    title: "2. Your sounds and folders",
    body: [
      "Local library folders remain your material. Algophony Studio should index file paths, metadata, descriptors, and tags without taking ownership of the original audio.",
      "When a project needs portability, Algophony Studio can copy selected files into a local project library or export archive at the user's request.",
    ],
  },
  {
    title: "3. Generated, derived and organized audio",
    body: [
      "Generated sounds should be saved locally with prompt text, provider, model, settings, source references, and synthetic-origin metadata where possible.",
      "Imported sounds, generated sounds, and derived stack outputs should all carry enough provenance to support creative use, research review, and dataset exports.",
    ],
  },
  {
    title: "4. Bring-your-own providers",
    body: [
      "Algophony Studio should not ship with shared ElevenLabs, Gemini, LLM, agent, webhook, or storage credentials. Each user configures their own providers locally and uses their own provider accounts.",
      "Provider keys should not be included in backups, datasets, DAW exports, game manifests, agent archives, issues, commits, or support messages.",
    ],
  },
  {
    title: "5. Responsible use",
    body: [
      "Do not use Algophony Studio to impersonate real people, hide synthetic origin where disclosure is expected, infringe third-party rights, or misrepresent generated audio as documentary evidence.",
      "You are responsible for the rights and permissions attached to any local sounds, reference material, prompts, generated outputs, and exports you use.",
    ],
  },
  {
    title: "6. Research exports",
    body: [
      "Dataset and benchmark exports should identify whether each sound is local, generated, or derived. They should also include tags, prompts, descriptors, comparison notes, and source provenance when available.",
      "Exports are meant to be inspectable and portable, not a hidden lock-in format.",
    ],
  },
];

export default function EulaPage() {
  return (
    <div className="p-6 max-w-3xl mx-auto animate-fade-in">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-xs text-atlas-text-muted hover:text-atlas-text transition-colors mb-4"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to workspace
      </Link>

      <div className="flex items-baseline justify-between mb-1">
        <h1 className="text-lg font-semibold text-atlas-text">Local use notes</h1>
        <span className="text-[11px] text-atlas-text-dim">Last updated - {LAST_UPDATED}</span>
      </div>

      <p className="text-sm text-atlas-text-muted leading-relaxed mt-3">
        These notes describe local use, provider-key ownership, sound organization, provenance, and research exports.
      </p>

      <div className="mt-6 space-y-5">
        {SECTIONS.map((section) => (
          <section key={section.title} className="atlas-card p-5 space-y-2">
            <h2 className="text-sm font-semibold text-atlas-text">{section.title}</h2>
            {section.body.map((para, i) => (
              <p key={i} className="text-xs text-atlas-text-muted leading-relaxed">
                {para}
              </p>
            ))}
          </section>
        ))}
      </div>

      <p className="text-[11px] text-atlas-text-dim mt-8 text-center">
        Algophony Studio is an open-source workspace for sonic libraries, ideas, stacking,
        optional generation, listening analysis, and research exports.
      </p>
    </div>
  );
}
