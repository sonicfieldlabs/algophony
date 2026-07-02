"use client";

import { SoundCard, suggestRouteDestination } from "@/lib/sfx/image-to-sound-taxonomy";
import { routeToTool, RouteDestination, ROUTE_DESTINATIONS } from "@/lib/sfx/route-to-tool";
import { useRouter } from "next/navigation";

interface SendToToolPanelProps {
  cards: SoundCard[];
  disabled?: boolean;
}

export function SendToToolPanel({ cards, disabled }: SendToToolPanelProps) {
  const router = useRouter();
  const completedCards = cards.filter(c => c.status === "generated");

  if (completedCards.length === 0) return null;

  const handleSendToTool = (card: SoundCard, destination: RouteDestination) => {
    if (!card.generationId || !card.audioUrl) return;

    // Build a generation record mock suitable for routeToTool
    const mockGeneration = {
      id: card.generationId,
      audio_storage_path: card.audioUrl, // Not a perfect mock but works for filename extraction
      duration_seconds: card.durationSeconds,
      elevenlabs_model_id: "eleven_text_to_sound_v2",
      request_payload: {
        text: card.prompt,
        duration_seconds: card.durationSeconds,
        loop: card.loop,
        prompt_influence: card.promptInfluence,
        category: card.category,
      },
      metadata: {
        exclusions: card.exclusions,
        layer_role: card.layerRole,
        category: card.category,
      }
    };

    const targetPath = routeToTool(mockGeneration, destination);
    router.push(targetPath);
  };

  return (
    <div className="atlas-card p-5 animate-slide-up space-y-4" style={{ animationDelay: "400ms" }}>
      <div>
        <h2 className="text-sm font-semibold text-atlas-text mb-1">
          Send to Tool
        </h2>
        <p className="text-xs text-atlas-text-dim">
          Route generated sounds to specific workspace tools for further design.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {completedCards.map(card => {
          const suggestedToolId = suggestRouteDestination(card);
          const toolDef = ROUTE_DESTINATIONS.find(r => r.id === suggestedToolId);

          return (
            <div key={card.id} className="bg-atlas-bg border border-atlas-border rounded-xl p-3 flex flex-col justify-between">
              <div>
                <div className="text-xs font-medium text-atlas-text truncate mb-1" title={card.title}>
                  {card.title}
                </div>
                <div className="text-xs text-atlas-text-dim truncate mb-3" title={card.prompt}>
                  {card.prompt}
                </div>
              </div>

              <div className="flex items-center gap-2 mt-auto pt-3 border-t border-atlas-border-subtle">
                <select
                  className="bg-atlas-surface-hover border border-atlas-border rounded-lg text-xs text-atlas-text px-2 py-1.5 focus:ring-1 focus:ring-atlas-accent outline-none flex-1"
                  onChange={(e) => handleSendToTool(card, e.target.value as RouteDestination)}
                  defaultValue=""
                  disabled={disabled}
                >
                  <option value="" disabled>Send to...</option>
                  <optgroup label="Suggested">
                    {toolDef && <option value={toolDef.id}>{toolDef.icon} {toolDef.label}</option>}
                  </optgroup>
                  <optgroup label="All Tools">
                    {ROUTE_DESTINATIONS.filter(r => r.id !== suggestedToolId).map(r => (
                      <option key={r.id} value={r.id}>{r.icon} {r.label}</option>
                    ))}
                  </optgroup>
                </select>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
