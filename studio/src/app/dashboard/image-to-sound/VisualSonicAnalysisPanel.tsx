"use client";

import { ImageAnalysis } from "@/lib/sfx/image-to-sound-taxonomy";
import { Eye, Map, Music2, Target, HelpCircle } from "lucide-react";

interface VisualSonicAnalysisPanelProps {
  analysis: ImageAnalysis | null;
  isAnalyzing: boolean;
}

export function VisualSonicAnalysisPanel({ analysis, isAnalyzing }: VisualSonicAnalysisPanelProps) {
  if (isAnalyzing) {
    return (
      <div className="atlas-card p-6 flex flex-col items-center justify-center min-h-[200px] animate-pulse-glow">
        <Eye className="h-6 w-6 text-atlas-accent animate-pulse mb-3" />
        <h3 className="text-sm font-semibold text-atlas-text">Analyzing Visuals...</h3>
        <p className="text-xs text-atlas-text-dim mt-1 text-center max-w-sm">
          Translating visual elements, textures, and implicit actions into a sonic design plan.
        </p>
      </div>
    );
  }

  if (!analysis) return null;

  return (
    <div className="atlas-card p-5 animate-slide-up space-y-5" style={{ animationDelay: "100ms" }}>
      <div className="flex items-center gap-2 mb-2">
        <Target className="h-4 w-4 text-atlas-accent" />
        <h2 className="text-sm font-semibold text-atlas-text">Sonic Translation</h2>
      </div>

      <div className="text-[13px] text-atlas-text leading-relaxed bg-atlas-bg p-3 rounded-lg border border-atlas-border-subtle">
        <span className="font-semibold text-atlas-text-muted mr-2">Visual Summary:</span>
        {analysis.imageSummary}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Details Column 1 */}
        <div className="space-y-4">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-atlas-text-dim mb-1.5 flex items-center gap-1.5">
              <Map className="h-3 w-3" /> Implied Space & Texture
            </h3>
            <div className="text-xs text-atlas-text mb-2">
              <span className="font-medium">Acoustic Space:</span> {analysis.acousticSpace}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {analysis.materialTextures.map((tex, i) => (
                <span key={i} className="px-2 py-0.5 rounded-full bg-atlas-surface-hover border border-atlas-border text-xs text-atlas-text-dim">
                  {tex}
                </span>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-atlas-text-dim mb-1.5 flex items-center gap-1.5">
              <Music2 className="h-3 w-3" /> Mood Profile
            </h3>
            <div className="flex flex-wrap gap-1.5 items-center">
              <span className="px-2 py-0.5 rounded-full bg-atlas-accent/10 border border-atlas-accent/20 text-xs font-semibold text-atlas-accent">
                {analysis.mood.primary}
              </span>
              {analysis.mood.secondary.map((m, i) => (
                <span key={i} className="px-2 py-0.5 rounded-full bg-atlas-surface-hover border border-atlas-border text-xs text-atlas-text-dim">
                  {m}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Details Column 2 */}
        <div className="space-y-4">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-atlas-text-dim mb-1.5">
              Implied Actions
            </h3>
            <ul className="list-disc pl-4 text-xs text-atlas-text-muted space-y-0.5">
              {analysis.impliedActions.map((action, i) => (
                <li key={i}>{action}</li>
              ))}
              {analysis.impliedActions.length === 0 && <li>No explicit actions</li>}
            </ul>
          </div>

          {analysis.missingInfoQuestions.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-widest text-atlas-text-dim mb-1.5 flex items-center gap-1.5 text-atlas-warning">
                <HelpCircle className="h-3 w-3" /> Missing Context
              </h3>
              <ul className="list-disc pl-4 text-xs text-atlas-text-muted space-y-0.5">
                {analysis.missingInfoQuestions.map((q, i) => (
                  <li key={i}>{q}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
