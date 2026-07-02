"use client";

/**
 * Tools — landing palette.
 *
 * Hub for every Tool sub-page. Uses the same lucide icons as the
 * sidebar dropdown so navigation and landing page stay visually
 * consistent.
 */

import Link from "next/link";
import {
  Headphones,
  Aperture,
  FlaskConical,
  Layers3,
  ArrowDownToLine,
  Send,
  type LucideIcon,
} from "lucide-react";

const PALETTE: { href: string; label: string; desc: string; icon: LucideIcon }[] = [
  { href: "/dashboard/listen",         label: "Sound to Prompt", desc: "Reverse-engineer audio into prompt cards", icon: Headphones },
  { href: "/dashboard/image-to-sound", label: "Image to Sound",  desc: "Convert visual scenes into sound cues",   icon: Aperture },
  { href: "/dashboard/variation-lab",  label: "Variation Lab",   desc: "Round-robins, intensity ladders, families", icon: FlaskConical },
  { href: "/dashboard/stacker",        label: "Stacker",         desc: "Frequency-aware multi-layer cue design",  icon: Layers3 },
  { href: "/dashboard/import",         label: "Import",          desc: "Batch CSV and metadata ingestion",        icon: ArrowDownToLine },
  { href: "/dashboard/export",         label: "Export",          desc: "DAW packs, cue sheets, game manifests",   icon: Send },
];

export default function ToolsPage() {
  return (
    <div className="p-4 pt-6 max-w-2xl mx-auto animate-fade-in">

      <div className="grid grid-cols-3 gap-2" data-stagger>
        {PALETTE.map(({ href, label, desc, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="atlas-card atlas-card-interactive group flex flex-col items-center justify-center text-center p-3"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-atlas-border-subtle bg-atlas-surface-hover/50 text-atlas-text-muted transition-colors group-hover:text-atlas-text group-hover:border-atlas-border mb-2">
              <Icon className="h-8 w-8" strokeWidth={1.5} />
            </div>
            <span className="block text-sm font-semibold text-atlas-text group-hover:text-atlas-accent transition-colors leading-tight">
              {label}
            </span>
            <span className="block text-[11px] text-atlas-text-muted mt-0.5 leading-snug">
              {desc}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
