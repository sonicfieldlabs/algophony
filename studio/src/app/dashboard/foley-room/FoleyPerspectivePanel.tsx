"use client";

import { Mic, Crosshair, Focus, Frame, Square, RectangleHorizontal, Maximize2, Eye, EyeOff, Volume } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RecordingSettings } from "@/lib/sfx/foley-taxonomy";
import {
  MIC_PERSPECTIVES, MIC_PERSPECTIVE_LABELS,
  ROOM_SIZES, ROOM_SIZE_LABELS,
  FG_BG_ROLES,
} from "@/lib/sfx/foley-taxonomy";

interface FoleyPerspectivePanelProps {
  recording: RecordingSettings;
  onChange: (r: RecordingSettings) => void;
}

// Map each option onto a graphic glyph so the picker reads spatially —
// concentric circles imply distance, rectangles imply room size, eye
// glyphs imply on/off screen role. Easier to scan than chips of text.
const MIC_ICONS: Record<string, React.ElementType> = {
  close_up: Crosshair,
  medium: Focus,
  far: Frame,
};
const ROOM_ICONS: Record<string, React.ElementType> = {
  intimate: Square,
  small: Square,
  medium: RectangleHorizontal,
  large: Maximize2,
  cathedral: Maximize2,
};
const ROLE_ICONS: Record<string, React.ElementType> = {
  foreground_sync: Eye,
  background_detail: EyeOff,
  offscreen_presence: Volume,
};
const FG_BG_LABELS: Record<string, string> = {
  foreground_sync: "Fg",
  background_detail: "Bg",
  offscreen_presence: "OS",
};

// Graphic segmented control — same as the chip row, but with icons + a
// shorter label rendered underneath. Each segment is a small button tile.
function IconGroup<T extends string>({
  label, values, selected, onSelect, labelMap, icons,
}: {
  label: string;
  values: readonly T[];
  selected: T;
  onSelect: (v: T) => void;
  labelMap?: Record<T, string>;
  icons: Record<string, React.ElementType>;
}) {
  return (
    <div className="space-y-1">
      <span className="text-[10px] font-semibold text-atlas-text-dim uppercase tracking-wide">{label}</span>
      <div className="flex gap-1">
        {values.map((v) => {
          const Icon = icons[v] ?? Mic;
          const isActive = selected === v;
          return (
            <button
              key={v}
              onClick={() => onSelect(v)}
              title={labelMap?.[v] ?? v.replace(/_/g, " ")}
              className={cn(
                "flex flex-1 flex-col items-center gap-0.5 rounded-md border py-1.5 px-1 transition-all",
                isActive
                  ? "border-atlas-accent bg-atlas-accent-muted text-atlas-accent"
                  : "border-atlas-border-subtle text-atlas-text-muted hover:border-atlas-border hover:text-atlas-text"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              <span className="text-[10px] font-medium leading-none truncate w-full text-center">
                {labelMap?.[v] ?? v.replace(/_/g, " ")}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function FoleyPerspectivePanel({ recording, onChange }: FoleyPerspectivePanelProps) {
  const update = (patch: Partial<RecordingSettings>) => onChange({ ...recording, ...patch });

  return (
    <div className="atlas-card p-3 space-y-2">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-atlas-text-dim flex items-center gap-1">
        <Mic className="h-3 w-3" />
        Recording Perspective
      </span>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <IconGroup label="Mic Distance" values={MIC_PERSPECTIVES} selected={recording.micPerspective} onSelect={(v) => update({ micPerspective: v })} labelMap={MIC_PERSPECTIVE_LABELS} icons={MIC_ICONS} />
        <IconGroup label="Room Size" values={ROOM_SIZES} selected={recording.roomSize} onSelect={(v) => update({ roomSize: v })} labelMap={ROOM_SIZE_LABELS} icons={ROOM_ICONS} />
        <IconGroup label="Role" values={FG_BG_ROLES} selected={recording.fgBgRole} onSelect={(v) => update({ fgBgRole: v })} labelMap={FG_BG_LABELS as Record<typeof recording.fgBgRole, string>} icons={ROLE_ICONS} />
      </div>
    </div>
  );
}
