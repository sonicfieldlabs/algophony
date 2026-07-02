"use client";

import { SlidersHorizontal } from "lucide-react";
import type { StackerLayer } from "@/lib/sfx/stacker-taxonomy";
import { getLayerTypeDef, getFrequencyRoleDef, FREQUENCY_ROLE_DEFS, type FrequencyRoleId } from "@/lib/sfx/stacker-taxonomy";

interface FrequencyRolePlannerProps {
  layers: StackerLayer[];
}

/**
 * Visual frequency-band grid showing where each layer sits spectrally.
 * Not DSP — this is a planning/orchestration tool that visualizes
 * the frequency role assignments across the stack.
 */
export function FrequencyRolePlanner({ layers }: FrequencyRolePlannerProps) {
  if (layers.length === 0) return null;

  // Ordered frequency bands from low to high
  const orderedRoles = FREQUENCY_ROLE_DEFS.filter(
    (r) => r.id !== "wide" && r.id !== "noise"
  ).sort((a, b) => {
    const order = ["sub", "low_body", "low_mid", "mid_detail", "upper_mid", "high_texture", "air", "transient_click"];
    return order.indexOf(a.id) - order.indexOf(b.id);
  });

  // Count layers per frequency role
  const roleCounts: Record<string, number> = {};
  for (const l of layers) {
    if (!l.muted) {
      roleCounts[l.frequencyRole] = (roleCounts[l.frequencyRole] ?? 0) + 1;
    }
  }

  // Detect spectral gaps and overlaps
  const gaps = orderedRoles.filter((r) => !roleCounts[r.id]);
  const overlaps = Object.entries(roleCounts).filter(([, count]) => count > 1);

  return (
    <div className="atlas-card p-4 space-y-3">
      <span className="text-xs font-semibold uppercase tracking-wider text-atlas-text-dim flex items-center gap-1">
        <SlidersHorizontal className="h-3 w-3" />
        Frequency Planner
      </span>

      <p className="text-[8px] text-atlas-text-dim/70">
        Spectral coverage across your stack. Adjust layer frequency roles to avoid gaps and conflicts.
      </p>

      {/* Spectral bands visualization */}
      <div className="space-y-1">
        {orderedRoles.map((role) => {
          const layersInRole = layers.filter((l) => !l.muted && l.frequencyRole === role.id);
          const hasLayers = layersInRole.length > 0;
          const hasOverlap = layersInRole.length > 1;

          return (
            <div key={role.id} className="flex items-center gap-2">
              {/* Label */}
              <div className="w-20 shrink-0 text-right">
                <span className="text-[8px] text-atlas-text-dim">{role.label}</span>
                <span className="text-[7px] text-atlas-text-dim/50 block">{role.range}</span>
              </div>

              {/* Band bar */}
              <div className="flex-1 h-5 relative rounded-md overflow-hidden bg-atlas-surface-hover">
                {hasLayers ? (
                  <div className="h-full flex gap-px">
                    {layersInRole.map((l) => {
                      const typeDef = getLayerTypeDef(l.layerType);
                      return (
                        <div
                          key={l.id}
                          className="flex-1 rounded-sm flex items-center justify-center transition-all"
                          style={{ backgroundColor: `hsl(${typeDef.hue}, 60%, 80%)` }}
                        >
                          <span
                            className="text-[7px] font-semibold truncate px-1"
                            style={{ color: `hsl(${typeDef.hue}, 70%, 30%)` }}
                          >
                            {typeDef.shortLabel}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center">
                    <span className="text-[7px] text-atlas-text-dim/30">—</span>
                  </div>
                )}

                {/* Overlap warning */}
                {hasOverlap && (
                  <div className="absolute right-1 top-1/2 -translate-y-1/2">
                    <span className="text-[6px] bg-amber-400/80 text-amber-900 rounded px-0.5 font-bold">×{layersInRole.length}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Wide/Noise special row */}
        {layers.filter((l) => !l.muted && (l.frequencyRole === "wide" || l.frequencyRole === "noise")).length > 0 && (
          <div className="flex items-center gap-2 pt-1 border-t border-atlas-border-subtle">
            <div className="w-20 shrink-0 text-right">
              <span className="text-[8px] text-atlas-text-dim">Broadband</span>
            </div>
            <div className="flex-1 h-5 rounded-md bg-atlas-surface-hover flex gap-px overflow-hidden">
              {layers.filter((l) => !l.muted && (l.frequencyRole === "wide" || l.frequencyRole === "noise")).map((l) => {
                const typeDef = getLayerTypeDef(l.layerType);
                const freqDef = getFrequencyRoleDef(l.frequencyRole);
                return (
                  <div
                    key={l.id}
                    className="flex-1 rounded-sm flex items-center justify-center"
                    style={{ backgroundColor: `hsl(${typeDef.hue}, 60%, 80%)` }}
                  >
                    <span className="text-[7px] font-semibold truncate px-1" style={{ color: `hsl(${typeDef.hue}, 70%, 30%)` }}>
                      {typeDef.shortLabel} ({freqDef.label})
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Diagnostics */}
      <div className="flex flex-wrap gap-1.5">
        {gaps.length > 0 && (
          <span className="text-[8px] text-atlas-text-dim">
            Gaps: {gaps.map((g) => g.label).join(", ")}
          </span>
        )}
        {overlaps.length > 0 && (
          <span className="text-[8px] text-amber-400">
            Overlap: {overlaps.map(([role, count]) => `${getFrequencyRoleDef(role as FrequencyRoleId).label} (×${count})`).join(", ")}
          </span>
        )}
        {gaps.length === 0 && overlaps.length === 0 && (
          <span className="text-[8px] text-atlas-success">Full spectral coverage ✓</span>
        )}
      </div>
    </div>
  );
}
