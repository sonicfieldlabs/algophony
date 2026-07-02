/**
 * Algophony Studio — Supervisor Intent Router
 *
 * §5.10: Classify user messages and route to the appropriate tool.
 * Replaces the single-tool cue list approach with multi-tool dispatch.
 */

import type { ToolName } from "./types";

export interface IntentClassification {
  intent: ToolName | "chat" | "out_of_scope";
  confidence: number;
  extractedParams: Record<string, unknown>;
}

/** Keyword patterns → tool mappings */
const INTENT_PATTERNS: Array<{
  patterns: RegExp[];
  tool: ToolName | "chat" | "out_of_scope";
  paramExtractor?: (text: string) => Record<string, unknown>;
}> = [
  // Scene breakdown / cue list
  {
    patterns: [
      /break\s*down/i,
      /cue\s*(list|sheet)/i,
      /scene\s*(description|breakdown)/i,
      /what\s*sounds?\s*(does|would|do|should)/i,
      /identify\s*(the\s+)?sounds?/i,
    ],
    tool: "create_sound_cue_list",
  },
  // Layer plan
  {
    patterns: [
      /layer\s*(plan|design)/i,
      /layered?\s+sound/i,
      /how\s+to\s+layer/i,
    ],
    tool: "create_layer_plan",
  },
  // Prompt card creation
  {
    patterns: [
      /create\s*(a\s+)?prompt\s*card/i,
      /make\s*(a\s+)?prompt/i,
      /write\s*(a\s+)?prompt/i,
    ],
    tool: "create_prompt_card",
  },
  // Batch prompt cards
  {
    patterns: [
      /batch\s*(of\s+)?prompt/i,
      /\d+\s+prompt\s*cards?/i,
      /prompt\s*cards?\s+for\s+(all|each|every)/i,
    ],
    tool: "create_prompt_cards_batch",
  },
  // Generate SFX
  {
    patterns: [
      /generate\s*(a\s+)?sound/i,
      /create\s*(a\s+)?sound\s*effect/i,
      /make\s*(me\s+)?(a\s+)?sfx/i,
    ],
    tool: "generate_sfx_from_prompt_card",
  },
  // Variations
  {
    patterns: [
      /variation/i,
      /variant/i,
      /\d+\s*(different\s+)?versions?/i,
      /alternatives?/i,
    ],
    tool: "generate_variation_batch",
  },
  // Cost estimation
  {
    patterns: [
      /cost/i,
      /estimate/i,
      /how\s+much/i,
      /provider\s+calls?/i,
    ],
    tool: "estimate_generation_cost",
  },
  // Usage / stats
  {
    patterns: [
      /usage/i,
      /stats/i,
      /how\s+many\s+(provider\s+calls?|generations?)/i,
      /my\s+(workspace|library)/i,
    ],
    tool: "get_usage_summary",
  },
  // Library / search
  {
    patterns: [
      /what.*(in\s+)?my\s+library/i,
      /search\s+(my\s+)?library/i,
      /find\s+(in\s+)?my\s+sounds?/i,
      /list\s+(my\s+)?generations?/i,
    ],
    tool: "get_project_context",
  },
  // Reference analysis
  {
    patterns: [
      /analy[sz]e\s*(this\s+)?reference/i,
      /analy[sz]e\s*(this\s+)?audio/i,
      /what\s+is\s+this\s+sound/i,
    ],
    tool: "analyze_reference_audio",
  },
  // Foley
  {
    patterns: [
      /foley/i,
      /footstep/i,
      /cloth\s*(movement|rustle)/i,
      /prop\s+sound/i,
    ],
    tool: "create_foley_set",
  },
  // Atmosphere
  {
    patterns: [
      /atmosphere/i,
      /ambient/i,
      /ambience/i,
      /background\s+sound/i,
      /room\s+tone/i,
    ],
    tool: "create_atmosphere_plan",
  },
  // UI sounds
  {
    patterns: [
      /ui\s+sound/i,
      /interface\s+sound/i,
      /notification\s+sound/i,
      /button\s+click/i,
    ],
    tool: "create_ui_sound_set",
  },
  // Export
  {
    patterns: [
      /export/i,
      /daw\s+(handoff|pack)/i,
      /reaper/i,
      /pro\s*tools/i,
      /ableton/i,
    ],
    tool: "prepare_export_plan",
  },
  // Out of scope
  {
    patterns: [
      /weather/i,
      /news/i,
      /joke/i,
      /recipe/i,
      /translate\s+(?!audio)/i,
      /write\s*(me\s+)?(a\s+)?(poem|story|essay|email)/i,
    ],
    tool: "out_of_scope",
  },
];

/**
 * Classify user intent from message text.
 * Returns the best-matching tool and confidence level.
 */
export function classifyIntent(text: string): IntentClassification {
  const normalized = text.trim().toLowerCase();

  // Check all patterns
  let bestMatch: IntentClassification = {
    intent: "chat",
    confidence: 0.3,
    extractedParams: {},
  };

  for (const mapping of INTENT_PATTERNS) {
    for (const pattern of mapping.patterns) {
      if (pattern.test(normalized)) {
        const params = mapping.paramExtractor?.(text) ?? {};
        // Multiple pattern matches increase confidence
        const confidence = 0.8;
        if (confidence > bestMatch.confidence) {
          bestMatch = {
            intent: mapping.tool,
            confidence,
            extractedParams: params,
          };
        }
      }
    }
  }

  return bestMatch;
}

/** Message to show when user asks something out of scope */
export const OUT_OF_SCOPE_RESPONSE =
  "I'm specialized in sound design and audio workflows. I can help you with:\n\n" +
  "• Breaking down scenes into sound cues\n" +
  "• Creating prompt cards and generating SFX\n" +
  "• Planning layered sound designs\n" +
  "• Analyzing reference audio\n" +
  "• Managing your library and exports\n\n" +
  "What sound design task can I help with?";
