"use client";

import { useMemo } from "react";

interface CreatureGlyphProps {
  creatureType: string;
  bodySize: string;
  pitchRegister: string;
  speed: string;
  aggressionLevel: string;
  wetDry: string;
  mouthType: string;
}

/** Size multiplier map */
const SIZE_SCALE: Record<string, number> = {
  tiny: 0.4, small: 0.6, medium: 0.8, large: 1.0, massive: 1.3, colossal: 1.6,
};

/** Pitch → color hue (blue to red) */
const PITCH_HUE: Record<string, number> = {
  "sub-bass": 240, bass: 220, "low-mid": 180, mid: 120, "upper-mid": 60, high: 30, "ultra-high": 0,
};

/** Speed → animation duration in ms */
const SPEED_DURATION: Record<string, number> = {
  "very slow": 4000, slow: 2500, moderate: 1500, fast: 800, "very fast": 400, erratic: 300,
};

/** Aggression → shake intensity */
const AGGRESSION_SHAKE: Record<string, number> = {
  passive: 0, curious: 0.5, alert: 1, agitated: 2, aggressive: 4, frenzied: 8,
};

/** Creature glyphs by type */
const TYPE_GLYPHS: Record<string, string> = {
  monster: "◉",
  alien: "⟡",
  dragon: "◈",
  insect: "◬",
  amphibian: "◎",
  bird: "◇",
  mammal: "●",
  hybrid: "⬡",
  mythical: "✦",
  mechanical: "⬢",
};

const MOUTH_GLYPHS: Record<string, string> = {
  beak: "▽", fangs: "▿", mandibles: "⊻", tentacles: "≋",
  membrane: "◠", shell: "⌓", throat: "⊙", snout: "▹",
};

export function CreatureGlyph({
  creatureType,
  bodySize,
  pitchRegister,
  speed,
  aggressionLevel,
  wetDry,
  mouthType,
}: CreatureGlyphProps) {
  const scale = SIZE_SCALE[bodySize] ?? 0.8;
  const hue = PITCH_HUE[pitchRegister] ?? 120;
  const animDuration = SPEED_DURATION[speed] ?? 1500;
  const shake = AGGRESSION_SHAKE[aggressionLevel] ?? 0;
  const isWet = wetDry === "wet" || wetDry === "very wet" || wetDry === "dripping";
  const mainGlyph = TYPE_GLYPHS[creatureType] || "◉";
  const mouthGlyph = MOUTH_GLYPHS[mouthType] || "";

  const glowColor = `hsl(${hue}, 70%, 50%)`;
  const glowBg = `hsla(${hue}, 60%, 40%, 0.15)`;

  const shakeKeyframes = useMemo(() => {
    if (shake <= 0) return "";
    return `@keyframes creature-shake {
      0%, 100% { transform: translate(0, 0) scale(${scale}); }
      25% { transform: translate(${shake}px, -${shake * 0.5}px) scale(${scale}); }
      50% { transform: translate(-${shake * 0.7}px, ${shake * 0.3}px) scale(${scale}); }
      75% { transform: translate(${shake * 0.5}px, ${shake * 0.7}px) scale(${scale}); }
    }`;
  }, [shake, scale]);

  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-atlas-border bg-atlas-bg p-6 relative overflow-hidden">
      {/* Inject keyframes */}
      {shakeKeyframes && <style>{shakeKeyframes}</style>}

      {/* Background glow */}
      <div
        className="absolute inset-0 rounded-xl transition-all duration-700"
        style={{
          background: `radial-gradient(circle at center, ${glowBg} 0%, transparent 70%)`,
        }}
      />

      {/* Creature body */}
      <div
        className="relative flex flex-col items-center transition-all duration-500"
        style={{
          transform: `scale(${scale})`,
          animation: shake > 0 ? `creature-shake ${animDuration}ms ease-in-out infinite` : undefined,
        }}
      >
        {/* Head/Eyes */}
        <div className="flex items-center gap-1 mb-1">
          <span
            className="text-xs transition-colors duration-500"
            style={{ color: glowColor, textShadow: `0 0 8px ${glowColor}` }}
          >
            ◦
          </span>
          <span
            className="transition-colors duration-500"
            style={{ color: glowColor, textShadow: `0 0 12px ${glowColor}` }}
          >
            ◦
          </span>
        </div>

        {/* Main body glyph */}
        <div
          className="text-5xl transition-all duration-500"
          style={{
            color: glowColor,
            textShadow: `0 0 20px ${glowColor}, 0 0 40px hsla(${hue}, 60%, 40%, 0.3)`,
            filter: isWet ? "blur(0.5px)" : undefined,
          }}
        >
          {mainGlyph}
        </div>

        {/* Mouth */}
        {mouthGlyph && (
          <div
            className="text-lg -mt-1 transition-colors duration-500"
            style={{ color: `hsl(${hue}, 50%, 40%)` }}
          >
            {mouthGlyph}
          </div>
        )}

        {/* Drip particles for wet texture */}
        {isWet && (
          <div className="absolute -bottom-2 flex gap-2">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="text-[8px] animate-pulse"
                style={{
                  color: `hsl(${hue}, 40%, 50%)`,
                  animationDelay: `${i * 400}ms`,
                  animationDuration: `${animDuration}ms`,
                }}
              >
                ·
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Labels */}
      <div className="mt-4 text-center relative z-10">
        <span className="text-xs text-atlas-text-dim">
          {creatureType || "creature"} · {bodySize} · {pitchRegister}
        </span>
      </div>
    </div>
  );
}
