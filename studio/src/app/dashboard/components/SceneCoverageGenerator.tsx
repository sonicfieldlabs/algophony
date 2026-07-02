"use client";

import { useState, useCallback } from "react";
import { Film, Sparkles, Copy, ArrowRight } from "lucide-react";

/* ── Types ───────────────────────────────────────────────────── */

export interface CoverageItem {
  prompt: string;
  frequencyRole: "sub" | "low" | "mid" | "high" | "air" | "full";
  durationRange: [number, number];
  loop: boolean;
}

export interface CoverageCategory {
  label: string;
  items: CoverageItem[];
}

export interface SceneCoverage {
  scene: string;
  categories: CoverageCategory[];
  totalLayers: number;
}

/* ── Decompose Engine ────────────────────────────────────────── */

function decomposeScene(description: string): SceneCoverage {
  const lower = description.toLowerCase();
  const ambiences: CoverageItem[] = [];
  const foley: CoverageItem[] = [];
  const objects: CoverageItem[] = [];
  const transitions: CoverageItem[] = [];

  // ── Weather ──
  if (/rain|storm|downpour|drizzle/.test(lower)) {
    ambiences.push({ prompt: "Heavy rain falling on mixed surfaces, urban rain ambience", frequencyRole: "full", durationRange: [15, 30], loop: true });
    if (/roof|plastic|metal|tin/.test(lower)) ambiences.push({ prompt: "Rain hitting plastic rooftops and metal awnings, rhythmic pattering", frequencyRole: "high", durationRange: [10, 20], loop: true });
    foley.push({ prompt: "Footsteps splashing through shallow puddles on wet pavement", frequencyRole: "mid", durationRange: [0.3, 0.8], loop: false });
  }
  if (/thunder|lightning/.test(lower)) {
    ambiences.push({ prompt: "Distant thunder rumbles, approaching storm", frequencyRole: "sub", durationRange: [5, 15], loop: false });
  }
  if (/wind|windy|gust/.test(lower)) {
    ambiences.push({ prompt: "Wind gusting through urban corridor, sustained wind", frequencyRole: "mid", durationRange: [10, 25], loop: true });
  }
  if (/snow|blizzard|frost/.test(lower)) {
    ambiences.push({ prompt: "Quiet snowfall ambience, muffled winter atmosphere, snow settling", frequencyRole: "air", durationRange: [15, 30], loop: true });
    foley.push({ prompt: "Boots crunching through fresh snow, compacting ice crystals", frequencyRole: "mid", durationRange: [0.2, 0.5], loop: false });
  }

  // ── Environments ──
  if (/market|bazaar|stall|vendor/.test(lower)) {
    ambiences.push({ prompt: "Busy market crowd murmur without clear speech, distant vendor activity", frequencyRole: "mid", durationRange: [15, 30], loop: true });
    objects.push({ prompt: "Market stall interaction, goods being handled, items clinking", frequencyRole: "high", durationRange: [0.5, 2], loop: false });
  }
  if (/street|road|city|urban/.test(lower)) {
    ambiences.push({ prompt: "Distant city traffic, urban atmosphere, cars passing far away", frequencyRole: "low", durationRange: [15, 30], loop: true });
  }
  if (/forest|wood|jungle|tree/.test(lower)) {
    ambiences.push({ prompt: "Forest ambience, birds, insects, leaves rustling in wind", frequencyRole: "full", durationRange: [20, 30], loop: true });
    foley.push({ prompt: "Footsteps on forest floor, twigs snapping, leaves crunching", frequencyRole: "mid", durationRange: [0.2, 0.5], loop: false });
  }
  if (/cave|underground|tunnel|sewer/.test(lower)) {
    ambiences.push({ prompt: "Underground cave ambience, dripping water, echoing hollow space", frequencyRole: "low", durationRange: [15, 30], loop: true });
  }
  if (/ocean|sea|beach|wave/.test(lower)) {
    ambiences.push({ prompt: "Ocean waves crashing on shore, rhythmic sea ambience", frequencyRole: "full", durationRange: [20, 30], loop: true });
  }
  if (/neon|electric|sign|billboard/.test(lower)) {
    objects.push({ prompt: "Neon sign electrical buzz, fluorescent tube flickering hum", frequencyRole: "high", durationRange: [5, 15], loop: true });
  }
  if (/bar|club|pub|restaurant/.test(lower)) {
    ambiences.push({ prompt: "Indoor bar ambience, glasses clinking, muffled crowd chatter", frequencyRole: "mid", durationRange: [15, 30], loop: true });
  }
  if (/factory|industrial|warehouse/.test(lower)) {
    ambiences.push({ prompt: "Industrial factory ambience, distant machinery hum, ventilation", frequencyRole: "low", durationRange: [15, 30], loop: true });
  }

  // ── Actions ──
  if (/chase|run|sprint|flee|pursuit/.test(lower)) {
    foley.push({ prompt: "Running footsteps on hard surface, fast-paced sprint", frequencyRole: "mid", durationRange: [0.3, 0.6], loop: false });
    foley.push({ prompt: "Fabric and clothing movement during running, jacket flapping", frequencyRole: "high", durationRange: [0.5, 1.5], loop: false });
    transitions.push({ prompt: "Fast whoosh cut, speed transition, movement blur", frequencyRole: "high", durationRange: [0.2, 0.8], loop: false });
    transitions.push({ prompt: "Impact accent hit, punctuation beat for action moment", frequencyRole: "mid", durationRange: [0.1, 0.5], loop: false });
  }
  if (/fight|combat|battle|punch|kick/.test(lower)) {
    foley.push({ prompt: "Body impact hit, fist connecting with body, combat punch", frequencyRole: "mid", durationRange: [0.1, 0.3], loop: false });
    foley.push({ prompt: "Heavy breathing during combat exertion, labored effort", frequencyRole: "air", durationRange: [1, 3], loop: false });
    objects.push({ prompt: "Weapon swing whoosh, blade or blunt weapon cutting through air", frequencyRole: "high", durationRange: [0.2, 0.6], loop: false });
  }
  if (/explosion|explod|blast|detonate/.test(lower)) {
    objects.push({ prompt: "Massive explosion with deep sub boom and debris scatter", frequencyRole: "sub", durationRange: [2, 5], loop: false });
    objects.push({ prompt: "Debris falling after explosion, rubble settling, dust", frequencyRole: "mid", durationRange: [3, 8], loop: false });
  }
  if (/crash|collision|impact|hit|smash/.test(lower)) {
    objects.push({ prompt: "Heavy impact collision, materials breaking and crashing", frequencyRole: "mid", durationRange: [0.5, 2], loop: false });
  }
  if (/door|gate|hatch/.test(lower)) {
    objects.push({ prompt: "Heavy door opening, hinges and mechanism, latch clicking", frequencyRole: "mid", durationRange: [1, 3], loop: false });
  }

  // ── Vehicles ──
  if (/car|vehicle|drive|engine/.test(lower)) {
    objects.push({ prompt: "Vehicle engine running, car motor idle or driving", frequencyRole: "low", durationRange: [5, 15], loop: true });
    if (/crash|chase/.test(lower)) objects.push({ prompt: "Tire screech on asphalt, car skidding", frequencyRole: "high", durationRange: [1, 3], loop: false });
  }
  if (/motorcycle|bike|motorbike/.test(lower)) {
    objects.push({ prompt: "Motorcycle engine revving and passing, doppler effect", frequencyRole: "mid", durationRange: [3, 8], loop: false });
  }

  // ── Materials / Objects ──
  if (/metal|steel|iron/.test(lower)) {
    objects.push({ prompt: "Metal object impact, steel resonance, metallic clang", frequencyRole: "mid", durationRange: [0.3, 1.5], loop: false });
  }
  if (/glass|window|shatter/.test(lower)) {
    objects.push({ prompt: "Glass shattering, window breaking into pieces, crystal fragments", frequencyRole: "high", durationRange: [0.5, 2], loop: false });
  }
  if (/wood|crate|box|barrel/.test(lower)) {
    objects.push({ prompt: "Wooden crates breaking, boxes falling and splintering", frequencyRole: "mid", durationRange: [0.5, 2], loop: false });
  }
  if (/fruit|food|vegetable/.test(lower)) {
    objects.push({ prompt: "Fruit and produce scattering, soft items tumbling and squishing", frequencyRole: "mid", durationRange: [0.5, 1.5], loop: false });
  }

  // ── Crowd / People ──
  if (/crowd|people|pedestrian/.test(lower)) {
    ambiences.push({ prompt: "Crowd walla, indistinct people murmuring, urban foot traffic", frequencyRole: "mid", durationRange: [15, 30], loop: true });
  }
  if (/scream|shout|yell/.test(lower)) {
    foley.push({ prompt: "Distant screams and shouts, crowd panic reaction", frequencyRole: "high", durationRange: [1, 4], loop: false });
  }

  // ── Hand / Body ──
  if (/hand|grab|push|pull/.test(lower)) {
    foley.push({ prompt: "Hand collision with hard surface, palm slap, grabbing", frequencyRole: "mid", durationRange: [0.1, 0.4], loop: false });
  }

  // ── Always add base transition if action scene ──
  if (/chase|fight|action|battle|escape|pursuit/.test(lower) && transitions.length === 0) {
    transitions.push({ prompt: "Fast whoosh transition, cinematic speed cut", frequencyRole: "high", durationRange: [0.2, 0.8], loop: false });
    transitions.push({ prompt: "Low impact accent, sub-bass punctuation hit", frequencyRole: "sub", durationRange: [0.2, 0.5], loop: false });
  }

  // ── Build output ──
  const categories: CoverageCategory[] = [];
  if (ambiences.length > 0) categories.push({ label: "Ambiences", items: ambiences });
  if (foley.length > 0) categories.push({ label: "Foley", items: foley });
  if (objects.length > 0) categories.push({ label: "Objects", items: objects });
  if (transitions.length > 0) categories.push({ label: "Transitions", items: transitions });

  const totalLayers = ambiences.length + foley.length + objects.length + transitions.length;

  return { scene: description, categories, totalLayers };
}

/* ── Component ───────────────────────────────────────────────── */

const CATEGORY_COLORS: Record<string, number> = {
  "Ambiences": 220, "Foley": 50, "Objects": 30, "Transitions": 300,
};

const FREQ_COLORS: Record<string, number> = {
  sub: 280, low: 240, mid: 160, high: 40, air: 320, full: 200,
};

interface SceneCoverageGeneratorProps {
  onSendToStacker?: (items: CoverageItem[], category: string) => void;
}

export function SceneCoverageGenerator({ onSendToStacker }: SceneCoverageGeneratorProps) {
  const [description, setDescription] = useState("");
  const [coverage, setCoverage] = useState<SceneCoverage | null>(null);

  const handleGenerate = useCallback(() => {
    if (!description.trim()) return;
    const result = decomposeScene(description);
    setCoverage(result);
  }, [description]);

  const handleCopyPrompt = useCallback((prompt: string) => {
    navigator.clipboard.writeText(prompt);
  }, []);

  return (
    <div className="atlas-card p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl" style={{ backgroundColor: "hsla(200, 50%, 50%, 0.1)" }}>
          <Film className="h-4 w-4" style={{ color: "hsl(200, 55%, 50%)" }} />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-atlas-text">Scene Coverage Generator</h2>
          <p className="text-xs text-atlas-text-dim">Generate a full sound coverage plan from a scene description</p>
        </div>
      </div>

      {/* Input */}
      <div className="space-y-3 mb-4">
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe a scene... e.g. 'A chase through a neon market during heavy rain'"
          className="w-full rounded-lg border border-atlas-border bg-atlas-bg px-4 py-3 text-sm text-atlas-text placeholder:text-atlas-text-dim focus:border-atlas-accent focus:outline-none resize-none"
          rows={3}
        />
        <button
          onClick={handleGenerate}
          disabled={!description.trim()}
          className="flex items-center gap-2 rounded-xl bg-atlas-accent px-5 py-2.5 text-sm font-medium text-white hover:bg-atlas-accent-hover transition-all disabled:opacity-50"
        >
          <Sparkles className="h-4 w-4" />
          Generate Coverage Plan
        </button>
      </div>

      {/* Results */}
      {coverage && (
        <div className="space-y-4 animate-fade-in">
          {/* Summary */}
          <div className="flex items-center gap-3 rounded-lg bg-atlas-surface-hover/50 px-4 py-3">
            <div className="text-sm text-atlas-text">
              <span className="font-semibold">{coverage.totalLayers}</span> layers across{" "}
              <span className="font-semibold">{coverage.categories.length}</span> categories
            </div>
          </div>

          {/* Categories */}
          {coverage.categories.map((cat) => {
            const hue = CATEGORY_COLORS[cat.label] ?? 200;
            return (
              <div key={cat.label}>
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-3 w-3 rounded-full" style={{ backgroundColor: `hsl(${hue}, 55%, 50%)` }} />
                  <h3 className="text-sm font-semibold text-atlas-text">{cat.label}</h3>
                  <span className="text-xs text-atlas-text-dim">({cat.items.length})</span>
                  {onSendToStacker && (
                    <button
                      onClick={() => onSendToStacker(cat.items, cat.label)}
                      className="ml-auto flex items-center gap-1 text-xs text-atlas-accent hover:underline"
                    >
                      <ArrowRight className="h-3 w-3" /> Send to Stacker
                    </button>
                  )}
                </div>
                <div className="space-y-1.5 ml-5">
                  {cat.items.map((item, i) => {
                    const fhue = FREQ_COLORS[item.frequencyRole] ?? 200;
                    return (
                      <div key={i} className="flex items-start gap-3 rounded-lg border border-atlas-border-subtle p-3 hover:bg-atlas-surface-hover/30 transition-colors">
                        <div className="flex flex-col items-center gap-1 shrink-0 pt-0.5">
                          <span className="rounded-md px-1.5 py-0.5 text-xs font-medium" style={{ backgroundColor: `hsla(${fhue}, 50%, 50%, 0.1)`, color: `hsl(${fhue}, 55%, 50%)` }}>
                            {item.frequencyRole}
                          </span>
                          {item.loop && <span className="text-xs text-atlas-accent">loop</span>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-atlas-text">{item.prompt}</p>
                          <span className="text-xs text-atlas-text-dim">{item.durationRange[0]}–{item.durationRange[1]}s</span>
                        </div>
                        <button onClick={() => handleCopyPrompt(item.prompt)} className="text-atlas-text-dim hover:text-atlas-accent shrink-0" title="Copy prompt">
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {coverage.categories.length === 0 && (
            <div className="text-center py-8 text-sm text-atlas-text-muted">
              No specific sound elements detected. Try adding more detail to your scene description.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
