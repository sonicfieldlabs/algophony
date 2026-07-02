/**
 * Algophony Studio — Scene Breakdown
 *
 * Deterministic MVP parser: splits a scene description into individual SFX event cards.
 * No LLM required.
 */

import type { SfxPromptAttributes } from "./prompt-schema";
import { composePrompt } from "./compose-prompt";
import { getCategoryDefinition } from "./taxonomy";

export interface SceneEvent {
  title: string;
  category: string;
  attributes: Partial<SfxPromptAttributes>;
  generatedPrompt: string;
}

/** Keyword-to-category mapping for detection */
const KEYWORD_CATEGORIES: Array<{ keywords: RegExp; category: string; defaultAction?: string }> = [
  { keywords: /\b(footstep|walk|step|boot|shoe|stride|tread|stomp)\b/i, category: "Footsteps", defaultAction: "walking" },
  { keywords: /\b(water|splash|drip|pour|flood|rain|stream|puddle|shallow water)\b/i, category: "Water" },
  { keywords: /\b(electric|spark|cable|wire|arc|zap|short circuit|static)\b/i, category: "Electricity" },
  { keywords: /\b(creature|monster|beast|crawl|slither|growl|screech|hiss)\b/i, category: "Creature" },
  { keywords: /\b(animal|rat|dog|cat|bird|insect|rodent|horse|snake)\b/i, category: "Animal" },
  { keywords: /\b(train|car|truck|vehicle|engine|motor|bus|tram|motorcycle)\b/i, category: "Vehicle" },
  { keywords: /\b(ambien|ambient|atmosphere|background|room tone|city|forest)\b/i, category: "Ambience" },
  { keywords: /\b(door|creak|slam|knock|lock|hinge)\b/i, category: "Door" },
  { keywords: /\b(gun|shot|reload|bullet|weapon|sword|knife|arrow)\b/i, category: "Weapon" },
  { keywords: /\b(explos|boom|cannon|blast|detonate)\b/i, category: "Booms" },
  { keywords: /\b(fire|flame|burn|torch|ember|campfire)\b/i, category: "Fire" },
  { keywords: /\b(wind|breeze|gust|whoosh|air)\b/i, category: "Air" },
  { keywords: /\b(bell|chime|ring)\b/i, category: "Bell" },
  { keywords: /\b(alarm|siren|buzzer|alert)\b/i, category: "Alarm" },
  { keywords: /\b(machine|drill|saw|hydraulic|gear|conveyor|crane)\b/i, category: "Machinery" },
  { keywords: /\b(magic|spell|enchant|portal|shimmer)\b/i, category: "Magic" },
  { keywords: /\b(robot|servo|mech|android|cyborg)\b/i, category: "Robot" },
  { keywords: /\b(sci-fi|laser|force field|teleport|plasma)\b/i, category: "Sci-fi" },
  { keywords: /\b(thunder|lightning|hail|blizzard|storm)\b/i, category: "Weather" },
  { keywords: /\b(horror|scream|whisper|bone|blood|ghost)\b/i, category: "Horror" },
  { keywords: /\b(impact|punch|kick|hit|crash|slam|collide)\b/i, category: "Impact" },
  { keywords: /\b(ui|click|notification|beep|interface)\b/i, category: "UI" },
  { keywords: /\b(boat|ship|sail|anchor|hull|wake)\b/i, category: "Boat" },
  { keywords: /\b(aircraft|plane|helicopter|jet|drone|propeller)\b/i, category: "Aircraft" },
];

/**
 * Split scene text into clauses by punctuation and conjunctions.
 */
function splitClauses(scene: string): string[] {
  // Split on common delimiters
  const raw = scene
    .split(/[,;.]/)
    .flatMap((s) => s.split(/\b(while|and|then|as|followed by|meanwhile)\b/i))
    .map((s) => s.trim())
    .filter((s) => s.length > 5);

  return raw;
}

/**
 * Detect the best-matching category for a clause.
 */
function detectCategory(clause: string): { category: string; defaultAction?: string } | null {
  for (const entry of KEYWORD_CATEGORIES) {
    if (entry.keywords.test(clause)) {
      return { category: entry.category, defaultAction: entry.defaultAction };
    }
  }
  return null;
}

/**
 * Extract environment hints from a clause.
 */
function extractEnvironment(clause: string): string | undefined {
  const envPatterns = [
    /\b(in (?:a |an |the )?)([\w\s]+(?:tunnel|room|hall|street|forest|cave|building|station|alley|corridor|basement))\b/i,
    /\b(through (?:a |an |the )?)([\w\s]+)\b/i,
    /\b(behind (?:a |an |the )?)([\w\s]+)\b/i,
  ];

  for (const pattern of envPatterns) {
    const match = clause.match(pattern);
    if (match) return match[2]?.trim();
  }

  return undefined;
}

/**
 * Break a scene description into individual SFX event cards.
 */
export function breakdownScene(scene: string): SceneEvent[] {
  if (!scene.trim()) return [];

  const clauses = splitClauses(scene);
  const events: SceneEvent[] = [];

  // First pass: check if the whole scene describes an environment (ambience)
  const wholeSceneEnv = extractEnvironment(scene);

  for (const clause of clauses) {
    const detected = detectCategory(clause);
    const category = detected?.category ?? "Foley";
    const catDef = getCategoryDefinition(category);
    const environment = extractEnvironment(clause) ?? wholeSceneEnv;

    // Build a descriptive title from the clause
    const title = buildTitle(clause, category);

    const attributes: Partial<SfxPromptAttributes> = {
      category,
      sourceObject: extractSourceObject(clause),
      action: detected?.defaultAction ?? extractAction(clause),
      environment,
      exclusions: catDef?.defaultExclusions ?? ["no music", "no dialogue"],
      loop: category === "Ambience",
      promptInfluence: 0.3,
      modelId: "eleven_text_to_sound_v2" as const,
    };

    const fullAttrs: SfxPromptAttributes = {
      category: attributes.category!,
      loop: attributes.loop ?? false,
      promptInfluence: attributes.promptInfluence ?? 0.3,
      modelId: "eleven_text_to_sound_v2",
      exclusions: attributes.exclusions ?? [],
      ...attributes,
    };

    events.push({
      title,
      category,
      attributes,
      generatedPrompt: composePrompt(fullAttrs),
    });
  }

  // Deduplicate similar events
  return deduplicateEvents(events);
}

function buildTitle(clause: string, _category: string): string {
  // Clean up and capitalize
  let title = clause.replace(/^(a |an |the )/i, "").trim();
  title = title.charAt(0).toUpperCase() + title.slice(1);
  if (title.length > 60) title = title.substring(0, 57) + "...";
  return title;
}

function extractSourceObject(clause: string): string | undefined {
  // Try to find nouns that are likely sound sources
  const objectPatterns = [
    /\b(cable|wire|panel|door|chain|train|creature|rat|boot|engine|bell|drum)\w*\b/i,
  ];
  for (const p of objectPatterns) {
    const match = clause.match(p);
    if (match) return match[0].toLowerCase();
  }
  return undefined;
}

function extractAction(clause: string): string | undefined {
  const actionPatterns = [
    /\b(crawl|walk|run|spark|rumbl|mov|splash|drip|crack|slam|click|screech|hiss|pour|burst)\w*\b/i,
  ];
  for (const p of actionPatterns) {
    const match = clause.match(p);
    if (match) return match[0].toLowerCase();
  }
  return undefined;
}

function deduplicateEvents(events: SceneEvent[]): SceneEvent[] {
  const seen = new Set<string>();
  return events.filter((e) => {
    const key = `${e.category}:${e.title.toLowerCase().substring(0, 30)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
