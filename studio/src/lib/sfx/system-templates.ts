/**
 * Algophony Studio — Sound System Templates
 *
 * Complete project templates that create:
 * - Project structure
 * - Required categories
 * - Prompt cards
 * - Variation targets
 * - Export rules
 * - Metadata schema
 * - Usage estimates
 *
 * Placement: Import page (project kickstart)
 */

// ── Template Schema ──────────────────────────────────────────

export interface SoundSystemTemplate {
  id: string;
  name: string;
  icon: string;
  description: string;
  targetUse: string;
  estimatedCredits: number;
  estimatedAssets: number;
  categories: TemplateCategory[];
  promptCards: TemplatePromptCard[];
  exportRules: TemplateExportRules;
  metadataSchema: string[];
  variationStrategy: string;
  sonicStyle: string;
  avoidList: string[];
}

export interface TemplateCategory {
  name: string;
  description: string;
  assetCount: number;
  variationsPerAsset: number;
  priority: "critical" | "important" | "optional";
  loopable: boolean;
  durationRange: string;
}

export interface TemplatePromptCard {
  title: string;
  category: string;
  prompt: string;
  exclusions: string[];
  layerRole: string;
  variations: number;
  loop: boolean;
  durationTarget: number;
}

export interface TemplateExportRules {
  preferredFormat: string;
  namingConvention: string;
  folderStructure: string;
  dawPreset: string;
  includeMetadata: boolean;
  includeProvenanceLog: boolean;
}

// ── Built-in Templates ───────────────────────────────────────

export const SOUND_SYSTEM_TEMPLATES: SoundSystemTemplate[] = [
  {
    id: "short_film",
    name: "Short Film Sound Package",
    icon: "🎬",
    description: "Complete sound design for a 5–15 minute short film with Foley, ambience, FX, and transitions.",
    targetUse: "Film / Post-production",
    estimatedCredits: 120,
    estimatedAssets: 60,
    categories: [
      { name: "Ambience", description: "Location ambiences and room tones", assetCount: 8, variationsPerAsset: 2, priority: "critical", loopable: true, durationRange: "30–60s" },
      { name: "Foley", description: "Footsteps, cloth, props, contacts", assetCount: 15, variationsPerAsset: 4, priority: "critical", loopable: false, durationRange: "0.3–2s" },
      { name: "Door", description: "Door open/close/creak/knock", assetCount: 6, variationsPerAsset: 3, priority: "important", loopable: false, durationRange: "0.5–3s" },
      { name: "Impact", description: "Hits, thuds, crashes", assetCount: 5, variationsPerAsset: 3, priority: "important", loopable: false, durationRange: "0.5–2s" },
      { name: "Transition", description: "Whooshes, risers, stingers", assetCount: 6, variationsPerAsset: 2, priority: "important", loopable: false, durationRange: "1–3s" },
      { name: "Texture", description: "Background textures and drones", assetCount: 4, variationsPerAsset: 1, priority: "optional", loopable: true, durationRange: "15–30s" },
    ],
    promptCards: [
      { title: "Interior Room Tone", category: "Ambience", prompt: "Quiet interior room tone, subtle air conditioning hum, close recording, residential apartment", exclusions: ["no traffic", "no music"], layerRole: "bed", variations: 2, loop: true, durationTarget: 30 },
      { title: "Footstep Wood", category: "Foley", prompt: "Single footstep on hardwood floor, medium weight, close mic, isolated", exclusions: ["no room reverb", "no ambience"], layerRole: "sync", variations: 6, loop: false, durationTarget: 0.5 },
      { title: "Door Creak", category: "Door", prompt: "Old wooden door creaking open slowly, rusty hinge, interior perspective", exclusions: ["no slam"], layerRole: "foreground", variations: 3, loop: false, durationTarget: 2 },
      { title: "Scene Whoosh", category: "Transition", prompt: "Cinematic whoosh transition, medium speed, low to high sweep, clean", exclusions: ["no reverb tail"], layerRole: "transition", variations: 3, loop: false, durationTarget: 1.5 },
    ],
    exportRules: { preferredFormat: "wav", namingConvention: "{project}_{scene}_{category}_{action}_v{version}", folderStructure: "Audio/{Category}/", dawPreset: "reaper", includeMetadata: true, includeProvenanceLog: true },
    metadataSchema: ["filename", "category", "scene", "cue", "description", "duration", "loopable", "layer_role"],
    variationStrategy: "4–6 round-robin for Foley, 2–3 for ambiences, 2 for transitions",
    sonicStyle: "cinematic, immersive, detailed, natural",
    avoidList: ["synthetic artifacts", "stock sounds", "obvious loops"],
  },
  {
    id: "game_level",
    name: "Game Level Ambience Package",
    icon: "🎮",
    description: "Complete ambient soundscape for a single game level with layers, events, and interactive elements.",
    targetUse: "Game Audio / Middleware",
    estimatedCredits: 80,
    estimatedAssets: 40,
    categories: [
      { name: "Ambience Bed", description: "Base ambient loops", assetCount: 4, variationsPerAsset: 2, priority: "critical", loopable: true, durationRange: "30–60s" },
      { name: "Ambience Event", description: "Random ambient events (bird, drip, creak)", assetCount: 8, variationsPerAsset: 4, priority: "critical", loopable: false, durationRange: "1–5s" },
      { name: "Player Feedback", description: "Footsteps, interaction, pickup", assetCount: 6, variationsPerAsset: 6, priority: "critical", loopable: false, durationRange: "0.2–1s" },
      { name: "Environmental FX", description: "Wind gust, water splash, machinery", assetCount: 5, variationsPerAsset: 3, priority: "important", loopable: false, durationRange: "1–4s" },
      { name: "Music Stinger", description: "Short musical stingers for events", assetCount: 3, variationsPerAsset: 2, priority: "optional", loopable: false, durationRange: "2–5s" },
    ],
    promptCards: [
      { title: "Forest Ambience Bed", category: "Ambience Bed", prompt: "Dense forest ambience, birds, wind through leaves, distant stream, natural outdoor recording feel, seamless loop", exclusions: ["no urban sounds", "no music"], layerRole: "bed", variations: 2, loop: true, durationTarget: 45 },
      { title: "Random Bird Call", category: "Ambience Event", prompt: "Single bird call, forest songbird, close recording, isolated, short", exclusions: ["no room", "no ambience"], layerRole: "event", variations: 6, loop: false, durationTarget: 2 },
      { title: "Footstep Gravel", category: "Player Feedback", prompt: "Single footstep on loose gravel, medium weight, close mic, game-ready", exclusions: ["no reverb"], layerRole: "sync", variations: 8, loop: false, durationTarget: 0.4 },
    ],
    exportRules: { preferredFormat: "wav", namingConvention: "{project}_{category}_{action}_{variation}", folderStructure: "Audio/SFX/{Category}/", dawPreset: "generic", includeMetadata: true, includeProvenanceLog: true },
    metadataSchema: ["filename", "category", "action", "variation", "duration", "loopable", "layer_role"],
    variationStrategy: "6–8 round-robin for player feedback, 4 for events, 2 for beds",
    sonicStyle: "responsive, variation-friendly, low-fatigue, natural",
    avoidList: ["long reverb tails", "musical elements", "speech masking"],
  },
  {
    id: "mobile_ui",
    name: "Mobile App UI Sound Package",
    icon: "📱",
    description: "Complete UI sound set for a mobile application with interactions, notifications, and system sounds.",
    targetUse: "App / Product Design",
    estimatedCredits: 45,
    estimatedAssets: 25,
    categories: [
      { name: "Primary Interaction", description: "Tap, click, toggle", assetCount: 4, variationsPerAsset: 3, priority: "critical", loopable: false, durationRange: "0.05–0.3s" },
      { name: "Secondary Interaction", description: "Swipe, scroll, drag", assetCount: 3, variationsPerAsset: 2, priority: "important", loopable: false, durationRange: "0.1–0.5s" },
      { name: "System Feedback", description: "Success, error, warning", assetCount: 4, variationsPerAsset: 2, priority: "critical", loopable: false, durationRange: "0.2–0.8s" },
      { name: "Notification", description: "Push notification, message, reminder", assetCount: 3, variationsPerAsset: 2, priority: "critical", loopable: false, durationRange: "0.3–1.2s" },
      { name: "Navigation", description: "Tab switch, page transition, back", assetCount: 3, variationsPerAsset: 2, priority: "important", loopable: false, durationRange: "0.1–0.4s" },
      { name: "Sonic Logo", description: "Brand audio signature", assetCount: 1, variationsPerAsset: 3, priority: "optional", loopable: false, durationRange: "1–3s" },
    ],
    promptCards: [
      { title: "Primary Tap", category: "Primary Interaction", prompt: "Soft premium UI tap click, minimal, clean transient, warm digital, under 100ms", exclusions: ["no reverb", "no music", "no harsh click", "no cartoon"], layerRole: "foreground", variations: 4, loop: false, durationTarget: 0.08 },
      { title: "Toggle On", category: "Primary Interaction", prompt: "Premium toggle switch on sound, soft mechanical click with subtle tonal confirmation, warm, under 200ms", exclusions: ["no harsh", "no alarm"], layerRole: "foreground", variations: 2, loop: false, durationTarget: 0.15 },
      { title: "Success", category: "System Feedback", prompt: "Soft success confirmation sound, two gentle ascending tones, warm and premium, under half second", exclusions: ["no harsh", "no alarm", "no long tail"], layerRole: "foreground", variations: 2, loop: false, durationTarget: 0.4 },
      { title: "Notification", category: "Notification", prompt: "Premium push notification, gentle attention-getting chime, warm but clear, not alarming, under 1 second", exclusions: ["no alarm siren", "no harsh bell"], layerRole: "foreground", variations: 2, loop: false, durationTarget: 0.8 },
    ],
    exportRules: { preferredFormat: "mp3_44100_128", namingConvention: "{brand}_{category}_{action}_{state}", folderStructure: "Sounds/{Category}/", dawPreset: "generic", includeMetadata: true, includeProvenanceLog: false },
    metadataSchema: ["filename", "category", "action", "description", "duration", "mood"],
    variationStrategy: "2–4 variations per interaction, A/B test at prompt_influence 0.3 vs 0.7",
    sonicStyle: "premium, minimal, warm, low-fatigue, non-musical",
    avoidList: ["cartoon sounds", "musical notifications", "harsh frequencies", "long tails", "generic stock clicks"],
  },
  {
    id: "podcast_transitions",
    name: "Podcast Transition Package",
    icon: "🎙️",
    description: "Transitions, bumpers, and sonic branding for podcast production.",
    targetUse: "Podcast / Audio Content",
    estimatedCredits: 30,
    estimatedAssets: 15,
    categories: [
      { name: "Intro/Outro", description: "Show open and close stingers", assetCount: 2, variationsPerAsset: 2, priority: "critical", loopable: false, durationRange: "2–5s" },
      { name: "Segment Transition", description: "Between-topic transitions", assetCount: 4, variationsPerAsset: 2, priority: "critical", loopable: false, durationRange: "1–3s" },
      { name: "Bed", description: "Under-speech background textures", assetCount: 3, variationsPerAsset: 1, priority: "important", loopable: true, durationRange: "30–60s" },
      { name: "Accent", description: "Punctuation sounds, emphasis hits", assetCount: 3, variationsPerAsset: 2, priority: "optional", loopable: false, durationRange: "0.3–1s" },
    ],
    promptCards: [
      { title: "Segment Swoosh", category: "Segment Transition", prompt: "Clean podcast transition swoosh, medium energy, professional, broadcast quality", exclusions: ["no reverb", "no music"], layerRole: "transition", variations: 3, loop: false, durationTarget: 1.5 },
      { title: "Under-Speech Bed", category: "Bed", prompt: "Subtle warm ambient bed, very quiet, speech-friendly, no distracting elements, seamless loop", exclusions: ["no melody", "no rhythm", "no speech masking"], layerRole: "bed", variations: 1, loop: true, durationTarget: 45 },
    ],
    exportRules: { preferredFormat: "mp3_44100_192", namingConvention: "{show}_{category}_{name}_v{version}", folderStructure: "Audio/{Category}/", dawPreset: "generic", includeMetadata: true, includeProvenanceLog: false },
    metadataSchema: ["filename", "category", "description", "duration", "loopable"],
    variationStrategy: "2–3 variations for transitions, 1 for beds",
    sonicStyle: "clean, professional, broadcast-quality, speech-friendly",
    avoidList: ["music", "speech masking frequencies", "heavy bass", "jarring sounds"],
  },
  {
    id: "trailer",
    name: "Trailer Sound Design Package",
    icon: "🎞️",
    description: "High-impact sound design for film/game trailers with hits, risers, whooshes, and stingers.",
    targetUse: "Trailer / Marketing",
    estimatedCredits: 65,
    estimatedAssets: 35,
    categories: [
      { name: "Impact Hit", description: "Cinematic impacts and booms", assetCount: 6, variationsPerAsset: 3, priority: "critical", loopable: false, durationRange: "1–4s" },
      { name: "Riser", description: "Building tension risers and swells", assetCount: 4, variationsPerAsset: 2, priority: "critical", loopable: false, durationRange: "3–10s" },
      { name: "Whoosh", description: "Speed whooshes and transitions", assetCount: 5, variationsPerAsset: 3, priority: "critical", loopable: false, durationRange: "0.5–2s" },
      { name: "Stinger", description: "Dramatic stingers and hits", assetCount: 4, variationsPerAsset: 2, priority: "important", loopable: false, durationRange: "1–3s" },
      { name: "Sub Drop", description: "Low-frequency drops and rumbles", assetCount: 3, variationsPerAsset: 2, priority: "important", loopable: false, durationRange: "2–5s" },
      { name: "Texture", description: "Dark atmospheric textures", assetCount: 3, variationsPerAsset: 1, priority: "optional", loopable: true, durationRange: "10–30s" },
    ],
    promptCards: [
      { title: "Cinematic Boom", category: "Impact Hit", prompt: "Massive cinematic impact boom, deep sub bass, layered debris, epic trailer hit, full frequency range", exclusions: ["no music", "no speech"], layerRole: "foreground", variations: 4, loop: false, durationTarget: 3 },
      { title: "Tension Riser", category: "Riser", prompt: "Slowly building tension riser, low to high sweep, increasing intensity, cinematic trailer quality", exclusions: ["no melody"], layerRole: "transition", variations: 2, loop: false, durationTarget: 6 },
      { title: "Fast Whoosh", category: "Whoosh", prompt: "Fast cinematic whoosh, left to right pass, punchy air movement, trailer quality", exclusions: [], layerRole: "transition", variations: 4, loop: false, durationTarget: 1 },
    ],
    exportRules: { preferredFormat: "wav", namingConvention: "{project}_TRL_{category}_{action}_v{version}", folderStructure: "Audio/{Category}/", dawPreset: "reaper", includeMetadata: true, includeProvenanceLog: true },
    metadataSchema: ["filename", "category", "description", "duration", "layer_role", "mood"],
    variationStrategy: "3–4 intensity levels per hit, 2–3 speed variants for whooshes",
    sonicStyle: "epic, massive, cinematic, layered, powerful",
    avoidList: ["thin sounds", "cheap stock FX", "musical clichés"],
  },
  {
    id: "creature_design",
    name: "Creature Design Package",
    icon: "🦎",
    description: "Complete creature voice and movement design with vocalization layers, breathing, and body sounds.",
    targetUse: "Game / Film Creature Design",
    estimatedCredits: 95,
    estimatedAssets: 50,
    categories: [
      { name: "Vocal - Idle", description: "Idle vocalizations, breathing, purring", assetCount: 5, variationsPerAsset: 4, priority: "critical", loopable: false, durationRange: "1–4s" },
      { name: "Vocal - Alert", description: "Alert growls, warning calls", assetCount: 4, variationsPerAsset: 4, priority: "critical", loopable: false, durationRange: "0.5–2s" },
      { name: "Vocal - Attack", description: "Attack roars, strike vocalizations", assetCount: 4, variationsPerAsset: 4, priority: "critical", loopable: false, durationRange: "0.5–3s" },
      { name: "Vocal - Pain", description: "Damage reactions, whimpers", assetCount: 3, variationsPerAsset: 4, priority: "important", loopable: false, durationRange: "0.3–1.5s" },
      { name: "Vocal - Death", description: "Death rattles, final breaths", assetCount: 2, variationsPerAsset: 3, priority: "important", loopable: false, durationRange: "2–5s" },
      { name: "Body Movement", description: "Footsteps, tail swish, wing flap", assetCount: 6, variationsPerAsset: 6, priority: "critical", loopable: false, durationRange: "0.3–1.5s" },
      { name: "Body Impact", description: "Landing, collision, slam", assetCount: 4, variationsPerAsset: 3, priority: "important", loopable: false, durationRange: "0.5–2s" },
    ],
    promptCards: [
      { title: "Idle Breathing", category: "Vocal - Idle", prompt: "Large creature breathing, slow deep inhale exhale, organic, wet, low register, close recording", exclusions: ["no music", "no speech", "no ambience"], layerRole: "foreground", variations: 6, loop: false, durationTarget: 3 },
      { title: "Attack Roar", category: "Vocal - Attack", prompt: "Aggressive creature roar, deep guttural attack vocalization, powerful, layered organic textures", exclusions: ["no music"], layerRole: "foreground", variations: 4, loop: false, durationTarget: 1.5 },
      { title: "Footstep Heavy", category: "Body Movement", prompt: "Heavy creature footstep on dirt, massive weight, thud with debris, isolated Foley", exclusions: ["no room reverb", "no ambience"], layerRole: "sync", variations: 8, loop: false, durationTarget: 0.5 },
    ],
    exportRules: { preferredFormat: "wav", namingConvention: "{creature}_{category}_{action}_{intensity}_v{version}", folderStructure: "Audio/Creature/{Category}/", dawPreset: "reaper", includeMetadata: true, includeProvenanceLog: true },
    metadataSchema: ["filename", "category", "action", "description", "duration", "variation", "layer_role", "material"],
    variationStrategy: "4–8 round-robin per action, intensity ladders for vocal states",
    sonicStyle: "organic, layered, guttural, powerful, detailed",
    avoidList: ["synthetic artifacts", "obviously digital", "musical elements", "human speech"],
  },
  {
    id: "horror_scene",
    name: "Horror Scene Package",
    icon: "👻",
    description: "Complete horror soundscape with drones, scares, tension builders, and unsettling textures.",
    targetUse: "Horror Film / Game",
    estimatedCredits: 55,
    estimatedAssets: 30,
    categories: [
      { name: "Drone", description: "Dark sustained drones and pads", assetCount: 4, variationsPerAsset: 1, priority: "critical", loopable: true, durationRange: "20–60s" },
      { name: "Scare", description: "Jump scare hits and stingers", assetCount: 4, variationsPerAsset: 3, priority: "critical", loopable: false, durationRange: "0.5–2s" },
      { name: "Tension", description: "Building tension risers and creaks", assetCount: 5, variationsPerAsset: 2, priority: "critical", loopable: false, durationRange: "3–10s" },
      { name: "Texture", description: "Unsettling textures and scrapes", assetCount: 5, variationsPerAsset: 2, priority: "important", loopable: false, durationRange: "2–6s" },
      { name: "Organic", description: "Wet organic sounds, breathing, dripping", assetCount: 4, variationsPerAsset: 3, priority: "important", loopable: false, durationRange: "1–4s" },
    ],
    promptCards: [
      { title: "Dark Drone", category: "Drone", prompt: "Deep dark horror drone, slowly evolving low frequency pad, ominous and unsettling, seamless loop", exclusions: ["no melody", "no bright frequencies"], layerRole: "bed", variations: 1, loop: true, durationTarget: 30 },
      { title: "Jump Scare", category: "Scare", prompt: "Sharp horror stinger, sudden loud impact, distorted low end, frightening, instant onset", exclusions: ["no music"], layerRole: "foreground", variations: 3, loop: false, durationTarget: 1 },
      { title: "Creaking Floor", category: "Tension", prompt: "Slow eerie floor creak, old wood bending under weight, isolated, horror atmosphere", exclusions: ["no ambience"], layerRole: "foreground", variations: 3, loop: false, durationTarget: 3 },
    ],
    exportRules: { preferredFormat: "wav", namingConvention: "{project}_HRR_{category}_{action}_v{version}", folderStructure: "Audio/Horror/{Category}/", dawPreset: "reaper", includeMetadata: true, includeProvenanceLog: true },
    metadataSchema: ["filename", "category", "description", "duration", "loopable", "mood", "layer_role"],
    variationStrategy: "1 for drones, 3 intensity levels for scares, 2–3 for textures",
    sonicStyle: "dark, ominous, unsettling, low-frequency, organic",
    avoidList: ["bright sounds", "cheerful tones", "musical clichés", "generic stock horror"],
  },
  {
    id: "documentary",
    name: "Documentary Location Enhancement Package",
    icon: "🌍",
    description: "Location-authentic ambiences, transitions, and enhancement layers for documentary production.",
    targetUse: "Documentary / Non-fiction",
    estimatedCredits: 40,
    estimatedAssets: 20,
    categories: [
      { name: "Location Ambience", description: "Authentic location ambiences", assetCount: 6, variationsPerAsset: 2, priority: "critical", loopable: true, durationRange: "30–60s" },
      { name: "Enhancement", description: "Subtle detail layers (wind, traffic, nature)", assetCount: 4, variationsPerAsset: 2, priority: "important", loopable: true, durationRange: "15–30s" },
      { name: "Transition", description: "Scene change transitions", assetCount: 3, variationsPerAsset: 2, priority: "important", loopable: false, durationRange: "1–3s" },
      { name: "Accent", description: "Detail accents (bird, vehicle pass, door)", assetCount: 4, variationsPerAsset: 2, priority: "optional", loopable: false, durationRange: "1–4s" },
    ],
    promptCards: [
      { title: "City Street", category: "Location Ambience", prompt: "Urban city street ambience, moderate traffic, distant voices, daytime, natural recording feel, seamless loop", exclusions: ["no music", "no clear speech"], layerRole: "bed", variations: 2, loop: true, durationTarget: 45 },
      { title: "Wind Layer", category: "Enhancement", prompt: "Gentle outdoor wind, subtle breeze through grass, natural recording, layer-friendly, seamless loop", exclusions: ["no gusts", "no strong wind"], layerRole: "bed", variations: 2, loop: true, durationTarget: 30 },
    ],
    exportRules: { preferredFormat: "wav", namingConvention: "{project}_DOC_{location}_{category}_v{version}", folderStructure: "Audio/Location/{Category}/", dawPreset: "resolve", includeMetadata: true, includeProvenanceLog: false },
    metadataSchema: ["filename", "category", "description", "duration", "loopable", "space", "layer_role"],
    variationStrategy: "2 per location, crossfadeable pairs",
    sonicStyle: "natural, authentic, location-recorded, documentary, speech-friendly",
    avoidList: ["synthetic sounds", "dramatic effects", "music", "obvious processing"],
  },
];

// ── Template Application ─────────────────────────────────────

/**
 * Convert a template into a Stacker-importable payload.
 */
export function templateToStackerPayload(template: SoundSystemTemplate): Record<string, unknown> {
  return {
    name: template.name,
    description: template.description,
    cues: template.promptCards.map((card, i) => ({
      id: crypto.randomUUID(),
      title: card.title,
      category: card.category,
      prompt: card.prompt,
      exclusions: card.exclusions,
      layerRole: card.layerRole,
      variations: card.variations,
      loop: card.loop,
      durationTarget: card.durationTarget,
      order: i,
    })),
    sonicStyle: template.sonicStyle,
    avoidList: template.avoidList,
    exportRules: template.exportRules,
  };
}

/**
 * Get template summary for display.
 */
export function getTemplateSummary(template: SoundSystemTemplate) {
  const totalAssets = template.categories.reduce(
    (sum, c) => sum + c.assetCount * c.variationsPerAsset,
    0
  );
  const criticalCount = template.categories.filter((c) => c.priority === "critical").length;

  return {
    totalAssets,
    criticalCategories: criticalCount,
    totalCategories: template.categories.length,
    promptCardCount: template.promptCards.length,
    estimatedCredits: template.estimatedCredits,
  };
}
