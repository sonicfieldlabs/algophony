"use client";

/**
 * Algophony Studio — Generative Avatar
 *
 * Deterministic SVG avatar keyed off a workspace id, drawn in the same
 * sonar/radar visual language as the app's AtlasMark logo. Each avatar is
 * a concentric arc/grid composition with a derived hue + glyph layout — so
 * the workspace always has the same local identity mark.
 */

import React from "react";

/** Stable 32-bit hash for any input string. FNV-1a-ish. */
function hash(seed: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return h >>> 0;
}

/** Seeded PRNG so every render of the same seed produces identical art. */
function seedRng(seed: number) {
  let state = seed || 1;
  return () => {
    state ^= state << 13; state >>>= 0;
    state ^= state >> 17; state >>>= 0;
    state ^= state << 5;  state >>>= 0;
    return (state >>> 0) / 0xffffffff;
  };
}

const SHAPE_KINDS = ["arcs", "rings", "bars", "constellation", "spiral", "grid"] as const;
type ShapeKind = (typeof SHAPE_KINDS)[number];

export interface AtlasAvatarProps {
  /** Identity seed — typically the local workspace id. */
  seed: string;
  /** Pixel size. Defaults to 40. */
  size?: number;
  /** Extra classes for the wrapping SVG. */
  className?: string;
  /** ARIA label — defaults to seed. */
  alt?: string;
}

export function AtlasAvatar({ seed, size = 40, className, alt }: AtlasAvatarProps) {
  const h = hash(seed || "anon");
  const rng = seedRng(h);

  // Derive a hue from the seed. Saturation/lightness stay near the brand
  // palette so the avatars feel consistent rather than chaotic.
  const hue = h % 360;
  const accent = `hsl(${hue}, 55%, 55%)`;
  const accentSoft = `hsl(${hue}, 50%, 88%)`;
  const accentDeep = `hsl(${hue}, 55%, 35%)`;

  const kind: ShapeKind = SHAPE_KINDS[h % SHAPE_KINDS.length];

  // 24-unit viewBox to match the AtlasMark scale.
  const center = 12;

  // Background tile — a soft, hue-coordinated square so the avatar reads
  // as a unit when placed in a header avatar slot.
  const bg = (
    <rect x={0} y={0} width={24} height={24} rx={6} fill={accentSoft} />
  );

  let glyph: React.ReactNode;
  switch (kind) {
    case "arcs": {
      // Concentric quarter-arcs radiating from the center, with a filled dot.
      const arcs = [3.5, 5.5, 8].map((r, i) => {
        const startAngle = (i * Math.PI) / 4;
        const x1 = center + Math.cos(startAngle) * r;
        const y1 = center + Math.sin(startAngle) * r;
        const x2 = center + Math.cos(startAngle + Math.PI / 1.6) * r;
        const y2 = center + Math.sin(startAngle + Math.PI / 1.6) * r;
        return (
          <path
            key={r}
            d={`M ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2}`}
            stroke={accentDeep}
            strokeWidth={1.4}
            strokeLinecap="round"
            fill="none"
            opacity={0.85 - i * 0.15}
          />
        );
      });
      glyph = (
        <>
          {arcs}
          <circle cx={center} cy={center} r={1.4} fill={accent} />
        </>
      );
      break;
    }
    case "rings": {
      glyph = (
        <>
          {[2.5, 5, 7.5].map((r, i) => (
            <circle
              key={r}
              cx={center}
              cy={center}
              r={r}
              stroke={accentDeep}
              strokeWidth={1.2}
              fill="none"
              opacity={0.85 - i * 0.2}
            />
          ))}
          <circle cx={center} cy={center} r={1.2} fill={accent} />
        </>
      );
      break;
    }
    case "bars": {
      // Vertical waveform-style bars with seeded heights.
      const bars = Array.from({ length: 6 }, (_, i) => {
        const x = 5 + i * 2.4;
        const heightSeed = rng();
        const heightPx = 4 + heightSeed * 12;
        const y = center - heightPx / 2;
        return (
          <rect
            key={i}
            x={x}
            y={y}
            width={1.6}
            height={heightPx}
            rx={0.8}
            fill={accentDeep}
            opacity={0.75 + heightSeed * 0.25}
          />
        );
      });
      glyph = <>{bars}</>;
      break;
    }
    case "constellation": {
      // 4–6 dots with thin connecting lines — like a tiny star map.
      const count = 4 + Math.floor(rng() * 3);
      const points = Array.from({ length: count }, () => ({
        x: 4 + rng() * 16,
        y: 4 + rng() * 16,
      }));
      const lines = points.slice(1).map((p, i) => (
        <line
          key={`l${i}`}
          x1={points[i].x}
          y1={points[i].y}
          x2={p.x}
          y2={p.y}
          stroke={accentDeep}
          strokeWidth={0.8}
          opacity={0.6}
        />
      ));
      const dots = points.map((p, i) => (
        <circle key={`p${i}`} cx={p.x} cy={p.y} r={i === 0 ? 1.6 : 1} fill={accent} />
      ));
      glyph = <>{lines}{dots}</>;
      break;
    }
    case "spiral": {
      // Logarithmic spiral approximated by a polyline.
      const segments = 24;
      const pts: string[] = [];
      for (let i = 0; i < segments; i++) {
        const t = (i / segments) * Math.PI * 2.5;
        const r = 1 + t * 1.05;
        pts.push(`${(center + Math.cos(t) * r).toFixed(2)},${(center + Math.sin(t) * r).toFixed(2)}`);
      }
      glyph = (
        <>
          <polyline
            points={pts.join(" ")}
            stroke={accentDeep}
            strokeWidth={1.2}
            fill="none"
            strokeLinecap="round"
          />
          <circle cx={center} cy={center} r={1.2} fill={accent} />
        </>
      );
      break;
    }
    case "grid": {
      // 3x3 dot grid with random subset highlighted.
      const dots: React.ReactNode[] = [];
      for (let i = 0; i < 9; i++) {
        const col = i % 3;
        const row = Math.floor(i / 3);
        const cx = 6 + col * 6;
        const cy = 6 + row * 6;
        const hot = rng() > 0.55;
        dots.push(
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r={hot ? 1.6 : 1}
            fill={hot ? accent : accentDeep}
            opacity={hot ? 1 : 0.45}
          />
        );
      }
      glyph = <>{dots}</>;
      break;
    }
  }

  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label={alt ?? `Avatar for ${seed}`}
    >
      {bg}
      {glyph}
    </svg>
  );
}
