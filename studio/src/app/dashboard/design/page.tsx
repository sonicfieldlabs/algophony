"use client";

/**
 * Sounds — landing palette.
 *
 * Hub for every Sounds sub-tool. Each card uses the same lucide icon
 * as the sidebar dropdown, so navigation and landing page stay
 * visually consistent.
 */

import Link from "next/link";
import {
  AudioWaveform,
  Bug,
  Users,
  Footprints,
  CloudFog,
  Rocket,
  SlidersHorizontal,
  Hexagon,
  type LucideIcon,
} from "lucide-react";

const PALETTE: { href: string; label: string; desc: string; icon: LucideIcon }[] = [
  { href: "/dashboard/generate",           label: "Generic",     desc: "Open-ended sound generation",              icon: AudioWaveform },
  { href: "/dashboard/creature-lab",       label: "Creature",    desc: "Non-human voices, bodies, textures",       icon: Bug },
  { href: "/dashboard/human-lab",          label: "Human",       desc: "Breath, effort, crowds, combat, magic",    icon: Users },
  { href: "/dashboard/foley-room",         label: "Foley Room",  desc: "Body, gesture, surface, material",         icon: Footprints },
  { href: "/dashboard/atmosphere-builder", label: "Atmosphere",  desc: "Layered ambiences & soundscapes",          icon: CloudFog },
  { href: "/dashboard/vehicle",            label: "Vehicle",     desc: "Engines, jets, tires, spaceships",         icon: Rocket },
  { href: "/dashboard/ui-elements",        label: "UI Elements", desc: "Interface sounds, alerts, transitions",    icon: SlidersHorizontal },
  { href: "/dashboard/candy",              label: "Misc",        desc: "Whooshes, textures, impacts, music tools",  icon: Hexagon },
];

export default function SoundsPage() {
  return (
    <div className="p-4 pt-6 max-w-3xl mx-auto animate-fade-in">

      <div className="grid grid-cols-4 gap-2" data-stagger>
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
