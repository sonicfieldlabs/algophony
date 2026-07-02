"use client";

import { memo } from "react";
import { cn } from "@/lib/utils";
import { AudioWaveform, Cpu } from "lucide-react";

interface FormatOption {
  value: string;
  label: string;
  type: "mp3" | "pcm";
  sampleRate: string;
  detail: string;
}

const FORMATS: FormatOption[] = [
  { value: "mp3_44100_128", label: "MP3", type: "mp3", sampleRate: "44.1kHz", detail: "128kbps" },
  { value: "mp3_44100_192", label: "MP3", type: "mp3", sampleRate: "44.1kHz", detail: "192kbps" },
  { value: "pcm_16000", label: "PCM", type: "pcm", sampleRate: "16kHz", detail: "RAW" },
  { value: "pcm_22050", label: "PCM", type: "pcm", sampleRate: "22kHz", detail: "RAW" },
  { value: "pcm_24000", label: "PCM", type: "pcm", sampleRate: "24kHz", detail: "RAW" },
  { value: "pcm_44100", label: "PCM", type: "pcm", sampleRate: "44.1kHz", detail: "RAW" },
];

interface FormatSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

function FormatSelectorInner({ value, onChange }: FormatSelectorProps) {
  return (
    <div>
      <label className="block text-xs font-medium text-atlas-text-muted mb-2">Output Format</label>
      <div className="grid grid-cols-3 gap-1.5">
        {FORMATS.map((fmt) => {
          const isActive = value === fmt.value;
          const Icon = fmt.type === "mp3" ? AudioWaveform : Cpu;
          return (
            <button
              key={fmt.value}
              onClick={() => onChange(fmt.value)}
              className={cn(
                "group relative flex flex-col items-center rounded-lg px-2 py-2.5 text-center transition-all duration-200",
                isActive
                  ? "atlas-card bg-atlas-accent-muted ring-1 ring-atlas-accent/30 shadow-sm"
                  : "atlas-card hover:border-atlas-border"
              )}
            >
              <Icon className={cn(
                "h-4 w-4 mb-1 transition-colors",
                isActive ? "text-atlas-accent" : "text-atlas-text-dim group-hover:text-atlas-text-muted"
              )} />
              <span className={cn(
                "text-xs font-semibold",
                isActive ? "text-atlas-accent" : "text-atlas-text-muted"
              )}>
                {fmt.sampleRate}
              </span>
              <span className={cn(
                "text-xs",
                isActive ? "text-atlas-accent/70" : "text-atlas-text-dim"
              )}>
                {fmt.label} · {fmt.detail}
              </span>
              {/* Active checkmark */}
              {isActive && (
                <div className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-atlas-accent flex items-center justify-center animate-scale-in">
                  <svg className="h-2 w-2 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export const FormatSelector = memo(FormatSelectorInner);
