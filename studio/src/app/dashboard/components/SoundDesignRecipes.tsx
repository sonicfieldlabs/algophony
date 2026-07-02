"use client";

import { useState, useCallback } from "react";
import { BookOpen, Copy, Layers, Zap, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

/* ── Recipe Data ─────────────────────────────────────────────── */

export interface RecipeLayer {
  role: string;
  frequencyRole: "sub" | "low" | "mid" | "high" | "air" | "full";
  promptTemplate: string;
  durationRange: [number, number];
  exclusions: string[];
}

export interface SoundDesignRecipe {
  id: string;
  name: string;
  category: string;
  description: string;
  layers: RecipeLayer[];
  variationAxes: string[];
  exportNaming: string;
  recommendedBatchCount: number;
  tags: string[];
}

const RECIPES: SoundDesignRecipe[] = [
  {
    id: "cinematic_impact",
    name: "Cinematic Impact",
    category: "Cinematic",
    description: "Full-spectrum hit with sub boom, body crunch, and air detail for trailers and transitions.",
    layers: [
      { role: "Sub Boom", frequencyRole: "sub", promptTemplate: "Deep sub bass boom impact, cinematic, earth-shaking low-end hit", durationRange: [1.5, 3], exclusions: ["music", "melody", "tonal pitch"] },
      { role: "Body Crunch", frequencyRole: "mid", promptTemplate: "Heavy mid-range impact crunch, debris, concrete breaking", durationRange: [0.8, 2], exclusions: ["reverb tail", "echo"] },
      { role: "Metal Ring", frequencyRole: "high", promptTemplate: "Bright metallic ring-out, shimmering high-frequency impact tail", durationRange: [1, 2.5], exclusions: ["distortion", "clipping"] },
      { role: "Air Sweetener", frequencyRole: "air", promptTemplate: "Subtle air movement whoosh, impact aftermath dust and debris settling", durationRange: [2, 4], exclusions: ["voice", "speech"] },
    ],
    variationAxes: ["intensity", "material", "distance", "room size"],
    exportNaming: "{project}_impact_{variation}_{take}",
    recommendedBatchCount: 5,
    tags: ["trailer", "film", "transition", "hit"],
  },
  {
    id: "creature_movement",
    name: "Creature Movement",
    category: "Creature",
    description: "Layered creature locomotion with body movement, surface contact, and organic texture.",
    layers: [
      { role: "Body Mass", frequencyRole: "low", promptTemplate: "Heavy creature body movement, weight shifting, large animal locomotion", durationRange: [1, 3], exclusions: ["voice", "roar", "vocalization"] },
      { role: "Surface Contact", frequencyRole: "mid", promptTemplate: "Creature feet on {surface}, claws scraping, pad impacts on ground", durationRange: [0.5, 2], exclusions: ["human footsteps"] },
      { role: "Organic Texture", frequencyRole: "high", promptTemplate: "Wet organic texture, skin friction, scales sliding, membrane stretching", durationRange: [1, 2.5], exclusions: ["mechanical", "synthetic"] },
      { role: "Breath Layer", frequencyRole: "air", promptTemplate: "Creature breathing during movement, labored animal respiration", durationRange: [1.5, 3], exclusions: ["speech", "words"] },
    ],
    variationAxes: ["creature size", "surface type", "speed", "aggression"],
    exportNaming: "{project}_creature_move_{variation}_{take}",
    recommendedBatchCount: 8,
    tags: ["creature", "animal", "movement", "game"],
  },
  {
    id: "ui_notification",
    name: "UI Notification",
    category: "UI/UX",
    description: "Clean, musical notification chime with tonal body, transient click, and subtle reverb.",
    layers: [
      { role: "Tonal Body", frequencyRole: "mid", promptTemplate: "Clean UI notification chime, pleasant musical tone, digital bell", durationRange: [0.3, 0.8], exclusions: ["noise", "distortion", "harsh"] },
      { role: "Transient Click", frequencyRole: "high", promptTemplate: "Crisp UI click transient, subtle digital tap at beginning of notification", durationRange: [0.05, 0.15], exclusions: ["reverb", "sustain"] },
      { role: "Subtle Tail", frequencyRole: "air", promptTemplate: "Gentle reverb tail, soft shimmer decay after notification chime", durationRange: [0.5, 1.5], exclusions: ["bass", "boom"] },
    ],
    variationAxes: ["pitch", "warmth", "urgency", "complexity"],
    exportNaming: "{project}_ui_notif_{state}_{take}",
    recommendedBatchCount: 6,
    tags: ["ui", "interface", "notification", "app"],
  },
  {
    id: "scifi_door",
    name: "Sci-Fi Door",
    category: "Sci-Fi",
    description: "Futuristic door mechanism with servo motor, pneumatic release, and electromagnetic hum.",
    layers: [
      { role: "Servo Motor", frequencyRole: "mid", promptTemplate: "Mechanical servo motor whir, futuristic door mechanism engaging, precise robotics", durationRange: [1, 2.5], exclusions: ["organic", "natural"] },
      { role: "Pneumatic Release", frequencyRole: "low", promptTemplate: "Pneumatic hiss and pressure release, hydraulic door seal breaking", durationRange: [0.5, 1.5], exclusions: ["music", "melody"] },
      { role: "Electromagnetic Hum", frequencyRole: "sub", promptTemplate: "Deep electromagnetic hum, power field activating, sci-fi energy drone", durationRange: [1.5, 3], exclusions: ["acoustic", "wooden"] },
      { role: "Metal Slide", frequencyRole: "high", promptTemplate: "Metal panel sliding on metal track, smooth futuristic door sliding open", durationRange: [1, 2], exclusions: ["rust", "creaky", "old"] },
    ],
    variationAxes: ["door size", "speed", "tech level", "condition"],
    exportNaming: "{project}_scifi_door_{action}_{take}",
    recommendedBatchCount: 4,
    tags: ["sci-fi", "door", "mechanism", "futuristic"],
  },
  {
    id: "horror_room_tone",
    name: "Horror Room Tone",
    category: "Horror",
    description: "Unsettling ambient room tone with low drone, subtle movement, and psychoacoustic unease.",
    layers: [
      { role: "Base Drone", frequencyRole: "sub", promptTemplate: "Dark low-frequency drone, ominous basement tone, barely audible rumble", durationRange: [10, 30], exclusions: ["music", "melody", "pleasant"] },
      { role: "Room Resonance", frequencyRole: "low", promptTemplate: "Empty room resonance, hollow space ambience, abandoned building interior", durationRange: [10, 30], exclusions: ["crowd", "people", "traffic"] },
      { role: "Subtle Presence", frequencyRole: "mid", promptTemplate: "Barely perceptible movement in darkness, subtle unexplained sound, almost-silence", durationRange: [5, 15], exclusions: ["obvious", "loud", "clear"] },
      { role: "High Tension", frequencyRole: "air", promptTemplate: "Ultra-high frequency tension, tinnitus-like ringing, psychological unease", durationRange: [10, 30], exclusions: ["warm", "comforting", "bright"] },
    ],
    variationAxes: ["tension level", "space type", "dampness", "age"],
    exportNaming: "{project}_horror_room_{mood}_{take}",
    recommendedBatchCount: 3,
    tags: ["horror", "ambient", "room tone", "tension"],
  },
  {
    id: "wet_footstep",
    name: "Wet Footstep",
    category: "Foley",
    description: "Detailed footstep on wet surface with impact, splash, and surface texture layers.",
    layers: [
      { role: "Foot Impact", frequencyRole: "low", promptTemplate: "Foot impact on wet pavement, shoe sole hitting wet ground, dull thud", durationRange: [0.1, 0.3], exclusions: ["dry", "sand", "gravel"] },
      { role: "Water Splash", frequencyRole: "mid", promptTemplate: "Small water splash from footstep in shallow puddle, wet splatter", durationRange: [0.2, 0.5], exclusions: ["large splash", "swimming"] },
      { role: "Surface Detail", frequencyRole: "high", promptTemplate: "Detailed wet surface friction, shoe texture against wet concrete, grit", durationRange: [0.1, 0.3], exclusions: ["carpet", "wood floor"] },
    ],
    variationAxes: ["wetness level", "shoe type", "walking speed", "surface"],
    exportNaming: "{project}_footstep_wet_{surface}_{take}",
    recommendedBatchCount: 12,
    tags: ["foley", "footsteps", "wet", "round-robin"],
  },
  {
    id: "trailer_whoosh",
    name: "Trailer Whoosh",
    category: "Cinematic",
    description: "Fast transition whoosh with tonal sweep, air movement, and optional sub tail.",
    layers: [
      { role: "Tonal Sweep", frequencyRole: "mid", promptTemplate: "Fast tonal whoosh sweep, rising or falling pitch transition, trailer whoosh", durationRange: [0.3, 1.2], exclusions: ["static", "constant"] },
      { role: "Air Movement", frequencyRole: "high", promptTemplate: "Fast air movement, wind rush past microphone, speed whoosh", durationRange: [0.2, 0.8], exclusions: ["slow", "gentle"] },
      { role: "Sub Tail", frequencyRole: "sub", promptTemplate: "Deep sub bass tail following whoosh, low-end weight to transition", durationRange: [0.5, 1.5], exclusions: ["treble", "bright only"] },
    ],
    variationAxes: ["speed", "direction", "pitch contour", "aggression"],
    exportNaming: "{project}_whoosh_{direction}_{take}",
    recommendedBatchCount: 8,
    tags: ["trailer", "whoosh", "transition", "cinematic"],
  },
  {
    id: "magic_spell",
    name: "Magic Spell",
    category: "Fantasy",
    description: "Layered spell cast with energy charge, release burst, and ethereal decay trail.",
    layers: [
      { role: "Energy Charge", frequencyRole: "low", promptTemplate: "Magical energy gathering, building power charge, arcane hum intensifying", durationRange: [1, 3], exclusions: ["mechanical", "industrial"] },
      { role: "Cast Burst", frequencyRole: "mid", promptTemplate: "Spell release burst, magical energy discharge, arcane explosion moment", durationRange: [0.3, 1], exclusions: ["realistic", "mundane"] },
      { role: "Sparkle Trail", frequencyRole: "high", promptTemplate: "Magical sparkle trail, shimmering particles, fairy dust dispersal", durationRange: [1.5, 4], exclusions: ["dark", "heavy", "bass"] },
      { role: "Ethereal Resonance", frequencyRole: "air", promptTemplate: "Otherworldly ethereal resonance, spell echo in magical dimension", durationRange: [2, 5], exclusions: ["concrete", "physical"] },
    ],
    variationAxes: ["element type", "power level", "school of magic", "caster"],
    exportNaming: "{project}_spell_{element}_{take}",
    recommendedBatchCount: 6,
    tags: ["magic", "spell", "fantasy", "game"],
  },
  {
    id: "mechanical_failure",
    name: "Mechanical Failure",
    category: "Industrial",
    description: "Machine breakdown with grinding stress, spark burst, and power-down sequence.",
    layers: [
      { role: "Grinding Stress", frequencyRole: "mid", promptTemplate: "Metal grinding under stress, machine bearing failure, gears stripping", durationRange: [2, 5], exclusions: ["smooth", "well-oiled", "quiet"] },
      { role: "Spark Burst", frequencyRole: "high", promptTemplate: "Electrical spark burst, short circuit arcing, machine sparking violently", durationRange: [0.5, 2], exclusions: ["water", "organic"] },
      { role: "Motor Strain", frequencyRole: "low", promptTemplate: "Electric motor straining and dying, RPM dropping, power struggling", durationRange: [3, 8], exclusions: ["acoustic", "natural"] },
      { role: "Power Down", frequencyRole: "sub", promptTemplate: "Deep power-down hum, electrical system shutting off, transformer dying", durationRange: [2, 4], exclusions: ["startup", "powering up"] },
    ],
    variationAxes: ["machine type", "failure severity", "environment", "age"],
    exportNaming: "{project}_mech_fail_{type}_{take}",
    recommendedBatchCount: 4,
    tags: ["mechanical", "industrial", "failure", "breakdown"],
  },
];

const CATEGORY_COLORS: Record<string, number> = {
  "Cinematic": 240, "Creature": 30, "UI/UX": 180, "Sci-Fi": 260,
  "Horror": 0, "Foley": 50, "Fantasy": 280, "Industrial": 120,
};

/* ── Component ───────────────────────────────────────────────── */

interface SoundDesignRecipesProps {
  onUseRecipe?: (recipe: SoundDesignRecipe) => void;
}

export function SoundDesignRecipes({ onUseRecipe }: SoundDesignRecipesProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const categories = ["all", ...Array.from(new Set(RECIPES.map((r) => r.category)))];
  const filtered = categoryFilter === "all" ? RECIPES : RECIPES.filter((r) => r.category === categoryFilter);
  const selected = RECIPES.find((r) => r.id === selectedId);

  const handleCopyPrompt = useCallback((prompt: string) => {
    navigator.clipboard.writeText(prompt);
  }, []);

  const FREQ_COLORS: Record<string, number> = {
    sub: 280, low: 240, mid: 160, high: 40, air: 320, full: 200,
  };

  return (
    <div className="atlas-card p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl" style={{ backgroundColor: "hsla(280, 50%, 50%, 0.1)" }}>
          <BookOpen className="h-4 w-4" style={{ color: "hsl(280, 55%, 50%)" }} />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-atlas-text">Sound Design Recipes</h2>
          <p className="text-xs text-atlas-text-dim">Reusable templates for complex layered effects</p>
        </div>
      </div>

      {/* Category filter */}
      <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategoryFilter(cat)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-all capitalize",
              categoryFilter === cat ? "bg-atlas-accent-muted text-atlas-accent" : "text-atlas-text-muted hover:text-atlas-text hover:bg-atlas-surface-hover"
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Grid + Detail split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recipe list */}
        <div className="lg:col-span-1 space-y-1.5 max-h-[500px] overflow-y-auto pr-1">
          {filtered.map((recipe) => {
            const hue = CATEGORY_COLORS[recipe.category] ?? 200;
            return (
              <button
                key={recipe.id}
                onClick={() => setSelectedId(recipe.id)}
                className={cn(
                  "w-full text-left rounded-lg p-3 transition-all",
                  selectedId === recipe.id
                    ? "bg-atlas-accent-muted border border-atlas-accent/30"
                    : "hover:bg-atlas-surface-hover border border-transparent"
                )}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className="flex h-6 w-6 items-center justify-center rounded-md" style={{ backgroundColor: `hsla(${hue}, 50%, 50%, 0.12)` }}>
                    <Layers className="h-3 w-3" style={{ color: `hsl(${hue}, 55%, 50%)` }} />
                  </div>
                  <span className="text-sm font-medium text-atlas-text">{recipe.name}</span>
                </div>
                <p className="text-xs text-atlas-text-dim line-clamp-2 ml-8">{recipe.description}</p>
                <div className="flex items-center gap-1.5 mt-1.5 ml-8">
                  <span className="text-xs text-atlas-text-dim">{recipe.layers.length} layers</span>
                  <span className="text-atlas-text-dim">·</span>
                  <span className="text-xs text-atlas-text-dim">{recipe.recommendedBatchCount} takes</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Detail panel */}
        <div className="lg:col-span-2">
          {selected ? (
            <div className="space-y-4 animate-fade-in">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold text-atlas-text">{selected.name}</h3>
                  <p className="text-xs text-atlas-text-dim mt-0.5">{selected.description}</p>
                </div>
                {onUseRecipe && (
                  <button
                    onClick={() => onUseRecipe(selected)}
                    className="flex items-center gap-2 rounded-xl bg-atlas-accent px-4 py-2 text-xs font-medium text-white hover:bg-atlas-accent-hover transition-all"
                  >
                    <ArrowRight className="h-3.5 w-3.5" /> Use Recipe
                  </button>
                )}
              </div>

              {/* Layers */}
              <div>
                <h4 className="text-xs font-semibold text-atlas-text-dim uppercase tracking-wider mb-2">Layers</h4>
                <div className="space-y-2">
                  {selected.layers.map((layer, i) => {
                    const fhue = FREQ_COLORS[layer.frequencyRole] ?? 200;
                    return (
                      <div key={i} className="rounded-lg border border-atlas-border-subtle p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="rounded-md px-2 py-0.5 text-xs font-medium" style={{ backgroundColor: `hsla(${fhue}, 50%, 50%, 0.1)`, color: `hsl(${fhue}, 55%, 50%)` }}>
                              {layer.frequencyRole}
                            </span>
                            <span className="text-sm font-medium text-atlas-text">{layer.role}</span>
                          </div>
                          <button onClick={() => handleCopyPrompt(layer.promptTemplate)} className="text-atlas-text-dim hover:text-atlas-accent transition-colors" title="Copy prompt">
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <p className="text-xs text-atlas-text-muted mb-1.5 italic">&quot;{layer.promptTemplate}&quot;</p>
                        <div className="flex flex-wrap gap-2 text-xs text-atlas-text-dim">
                          <span>Duration: {layer.durationRange[0]}–{layer.durationRange[1]}s</span>
                          {layer.exclusions.length > 0 && (
                            <span className="text-atlas-danger/70">Exclude: {layer.exclusions.join(", ")}</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Metadata */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-atlas-border-subtle p-3">
                  <h4 className="text-xs font-semibold text-atlas-text-dim mb-1.5">Variation Axes</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {selected.variationAxes.map((axis) => (
                      <span key={axis} className="rounded-md bg-atlas-surface-hover px-2 py-0.5 text-xs text-atlas-text-muted">{axis}</span>
                    ))}
                  </div>
                </div>
                <div className="rounded-lg border border-atlas-border-subtle p-3">
                  <h4 className="text-xs font-semibold text-atlas-text-dim mb-1.5">Export & Batch</h4>
                  <p className="text-xs text-atlas-text-muted font-mono mb-1">{selected.exportNaming}</p>
                  <div className="flex items-center gap-1.5 text-xs text-atlas-text-dim">
                    <Zap className="h-3 w-3" /> Recommended: {selected.recommendedBatchCount} takes
                  </div>
                </div>
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-1.5">
                {selected.tags.map((tag) => (
                  <span key={tag} className="rounded-full bg-atlas-accent-muted px-2.5 py-0.5 text-xs text-atlas-accent font-medium">{tag}</span>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <BookOpen className="h-8 w-8 text-atlas-text-dim mb-3" />
              <p className="text-sm text-atlas-text-muted">Select a recipe to see its layers, prompts, and configuration</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
