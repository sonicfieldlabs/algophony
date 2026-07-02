"use client";

import { useState, useCallback } from "react";
import { Bug, Plus, Wand2, Rocket, Flame, Fish } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/app/dashboard/toast";
import { AtlasSlider } from "@/app/dashboard/generate/AtlasSlider";

import { LayerRack, type CreatureLayer } from "./LayerRack";

/* ─────────────────────────────────────────────────────────────
 *  Lenses — preset bundles that snap multiple dimensions at once
 *  and bias the composed prompt with a lens phrase.
 * ───────────────────────────────────────────────────────────── */

interface LensPreset {
  creatureType: string;
  magicalArchetype: string;
  sciFiVector: string;
  elementalAffinity: string;
  animalTaxonomy: string;
  powerForce: string;
}

interface LensDef {
  id: "balanced" | "magic" | "scifi" | "elemental" | "fauna";
  label: string;
  icon: React.ElementType;
  hue: number;
  description: string;
  phrase: string;            // injected into composed prompt
  primarySection: "fantasy" | "magic" | "scifi" | "elemental" | "fauna";
  preset: LensPreset;
}

const LENS_DEFS: LensDef[] = [
  {
    id: "balanced", label: "Balanced", icon: Bug, hue: 30,
    description: "All dimensions available, no preset bias.",
    phrase: "",
    primarySection: "fantasy",
    preset: { creatureType: "monster", magicalArchetype: "none", sciFiVector: "none", elementalAffinity: "none", animalTaxonomy: "none", powerForce: "none" },
  },
  {
    id: "magic", label: "Magic", icon: Wand2, hue: 280,
    description: "Spellcasters, rituals, necromancy, fey and divine creatures.",
    phrase: "arcane magical being, casting and chanting energy, occult ritual sound design",
    primarySection: "magic",
    preset: { creatureType: "mythical", magicalArchetype: "arcane", sciFiVector: "none", elementalAffinity: "none", animalTaxonomy: "none", powerForce: "summoning" },
  },
  {
    id: "scifi", label: "Sci-fi", icon: Rocket, hue: 200,
    description: "Synthetics, robotics, biomech, swarms, extraterrestrials.",
    phrase: "futuristic synthetic entity, biomechanical resonance, alien intelligence",
    primarySection: "scifi",
    preset: { creatureType: "synthetic", magicalArchetype: "none", sciFiVector: "synthetic_ai", elementalAffinity: "none", animalTaxonomy: "none", powerForce: "telepathic_shriek" },
  },
  {
    id: "elemental", label: "Elemental", icon: Flame, hue: 0,
    description: "Forces of nature — fire, water, earth, air, void, lightning.",
    phrase: "primal elemental being, forces of nature manifest as sound",
    primarySection: "elemental",
    preset: { creatureType: "elemental", magicalArchetype: "primal", sciFiVector: "none", elementalAffinity: "fire", animalTaxonomy: "none", powerForce: "shockwave" },
  },
  {
    id: "fauna", label: "Fauna", icon: Fish, hue: 130,
    description: "Animal-grounded — apex predators, prey, swarms, aquatics, avians.",
    phrase: "naturalistic animal-grounded creature, biological wildlife recording feel",
    primarySection: "fauna",
    preset: { creatureType: "mammal", magicalArchetype: "none", sciFiVector: "none", elementalAffinity: "none", animalTaxonomy: "apex_predator", powerForce: "none" },
  },
];

const CREATURE_TYPES = [
  "monster", "alien", "dragon", "insect", "amphibian", "bird", "mammal",
  "hybrid", "mythical", "mechanical",
  "elemental", "undead", "demon", "angel", "spirit", "eldritch",
  "synthetic", "biomech", "swarm", "plant",
];
const ELEMENTAL_AFFINITIES = [
  "none", "fire", "water", "earth", "air", "lightning", "ice",
  "shadow", "light", "void", "metal", "wood", "blood", "psionic",
];
const MAGICAL_ARCHETYPES = [
  "none", "arcane", "necromantic", "divine", "fey", "primal",
  "blood_magic", "ritual", "elemental_casting", "summoner", "enchanter",
];
const SCI_FI_VECTORS = [
  "none", "synthetic_ai", "robotic", "biomech", "nanite_swarm",
  "hive_mind", "energy_being", "extraterrestrial", "interdimensional", "parasitic",
];
const ANIMAL_TAXONOMIES = [
  "none", "apex_predator", "prey", "pack_hunter", "swarm_insect",
  "aquatic", "avian", "reptilian", "amphibian", "subterranean",
];
const POWERS_FORCES = [
  "none", "fire_breath", "shockwave", "telekinetic", "venomous",
  "regenerative", "phasing", "teleporting", "summoning", "shapeshifting",
  "telepathic_shriek", "sonic_attack", "gravitic_pulse",
];
const DYNAMICS = [
  "passive", "alert", "curious", "playful", "stalking",
  "charging", "casting", "transforming", "dying", "awakening",
  "feeding", "hunting", "fleeing",
];
const BODY_SIZES = ["tiny", "small", "medium", "large", "massive", "colossal"];
const MOUTH_TYPES = ["beak", "fangs", "mandibles", "tentacles", "membrane", "shell", "throat", "snout"];
const PITCH_REGISTERS = ["sub-bass", "bass", "low-mid", "mid", "upper-mid", "high", "ultra-high"];
const SPEEDS = ["very slow", "slow", "moderate", "fast", "very fast", "erratic"];
const AGGRESSION_LEVELS = ["passive", "curious", "alert", "agitated", "aggressive", "frenzied"];
const WET_DRY = ["very dry", "dry", "neutral", "wet", "very wet", "dripping"];
const DISTANCES = ["intimate", "close-mic", "near", "medium", "far", "distant"];
const SPACES = ["tight cave", "open cave", "forest", "swamp", "underwater", "mountain", "desert", "void", "interior"];
const REALISM_LEVELS = ["hyper-realistic", "realistic", "stylized", "abstract", "cartoonish"];
const LAYER_ROLES = ["main", "background", "texture", "accent"];
const API_ROUTES = [
  { value: "creature_sfx", label: "SFX", endpoint: "/api/elevenlabs/generate-creature-layer" },
  { value: "tts_creature_layer", label: "TTS", endpoint: "/api/elevenlabs/text-to-speech-layer" },
  { value: "voice_design_preview", label: "Voice Design", endpoint: "/api/elevenlabs/design-voice-preview" },
];

const VOICE_EXPRESSIONS = [
  { id: "growl", label: "Growl", prompt: "*deep guttural growl* Rrrrrrhhh...", description: "Low aggressive rumble from the chest" },
  { id: "hiss", label: "Hiss", prompt: "*sharp hissing* Ssssssss...", description: "Snake-like sibilant threat display" },
  { id: "roar", label: "Roar", prompt: "*thundering roar* RAAAAAAHH!", description: "Full-volume territorial call" },
  { id: "whimper", label: "Whimper", prompt: "*soft whimper* Mmmhhh...", description: "Vulnerable, pained, submissive" },
  { id: "purr", label: "Purr", prompt: "*rumbling purr* Mmmmrrrrr...", description: "Contentment, low-frequency vibration" },
  { id: "screech", label: "Screech", prompt: "*piercing screech* EEEEEEE!", description: "High-pitched alarm or attack cry" },
  { id: "chatter", label: "Chatter", prompt: "*rapid clicking chatter* Tk-tk-tk-tk...", description: "Insectoid or primate communication" },
  { id: "breath", label: "Heavy Breath", prompt: "*heavy labored breathing* Hhhhh... hhhhh...", description: "Exhausted or predatory breathing" },
  { id: "whisper", label: "Whisper", prompt: "*eerie whisper* Come closer... closer...", description: "Unsettling quiet vocalization" },
  { id: "bellow", label: "Bellow", prompt: "*deep bellow* BWOOOOOMMM!", description: "Large creature low-frequency call" },
  { id: "trill", label: "Trill", prompt: "*melodic trill* Prrrrriii-iii...", description: "Bird-like or amphibian musical call" },
  { id: "gurgle", label: "Gurgle", prompt: "*wet gurgling* Glurblblbl...", description: "Aquatic or visceral throat sounds" },
];

const VOICE_DESIGN_TEMPLATES = [
  { id: "ancient_dragon", label: "Ancient Dragon", description: "A deep, resonant bass voice with gravel and rumbling undertones. Old, wise, immensely powerful. Chest resonance like stone grinding. Slight echo as if speaking from inside a mountain." },
  { id: "alien_insect", label: "Alien Insect", description: "A chitinous, clicking voice with mandible resonance. High-pitched buzzing undertone. Words formed through vibrating exoskeleton plates. Inhuman speech patterns." },
  { id: "ghost_spirit", label: "Ghost / Spirit", description: "An ethereal, whispering voice with reverberant quality. Slightly out of phase, like hearing from another dimension. Cold, disembodied, with trailing echoes." },
  { id: "golem_construct", label: "Golem / Construct", description: "A deep, mechanical voice with stone-grinding quality. Slow, deliberate speech with resonance like speaking through a cave system. Ancient and elemental." },
  { id: "swamp_creature", label: "Swamp Creature", description: "A wet, gurgling voice with bubbling undertones. Throat sounds like viscous liquid. Slow, dripping speech with amphibian quality. Dank and organic." },
  { id: "small_fairy", label: "Small Fairy / Pixie", description: "A tiny, bright, squeaky voice with bell-like quality. Very high pitch, fast speech. Effervescent and sparkling, like wind through crystal." },
  { id: "demon", label: "Demon / Dark Entity", description: "A layered voice with multiple pitches speaking simultaneously. Deep bass with high harmonic overlay. Threatening, ancient, with distorted growling undertones." },
  { id: "robot_ai", label: "Robot / AI", description: "A precise, synthetic voice with subtle digital artifacts. Clean articulation with occasional glitches or processing artifacts. Emotionally neutral but with uncanny smoothness." },
];

const TYPE_HUES: Record<string, number> = {
  monster: 0, alien: 160, dragon: 30, insect: 70, amphibian: 130,
  bird: 200, mammal: 45, hybrid: 280, mythical: 260, mechanical: 190,
};

/* ─────────────────────────────────────────────────────────────
 *  Category tab definitions — used by the tab system
 * ───────────────────────────────────────────────────────────── */
const CATEGORY_TABS = [
  { id: "magic", label: "Magic", icon: Wand2, hue: 280 },
  { id: "scifi", label: "Sci-fi", icon: Rocket, hue: 200 },
  { id: "elemental", label: "Elemental", icon: Flame, hue: 0 },
  { id: "fauna", label: "Fauna", icon: Fish, hue: 130 },
  { id: "powers", label: "Powers & Dynamics", icon: Bug, hue: 45 },
] as const;

type CategoryTabId = typeof CATEGORY_TABS[number]["id"];

/** Pill-style selector for discrete options */
function PillSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <div>
      <span className="text-xs font-medium text-atlas-text-dim mb-1 block">{label}</span>
      <div className="flex flex-wrap gap-1">
        {options.map((o) => (
          <button
            key={o} onClick={() => onChange(o)}
            className={cn(
              "rounded-full px-2 py-0.5 text-xs transition-all duration-150",
              "hover:scale-105 active:scale-95",
              value === o
                ? "bg-atlas-accent-muted text-atlas-accent ring-1 ring-atlas-accent/30 shadow-sm"
                : "bg-atlas-bg text-atlas-text-dim border border-atlas-border-subtle hover:text-atlas-text-muted"
            )}
          >
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Segmented toggle for 3-5 options */
function SegmentedToggle({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <div>
      <span className="text-xs font-medium text-atlas-text-dim mb-1 block">{label}</span>
      <div className="flex rounded-lg border border-atlas-border overflow-hidden">
        {options.map((o, i) => (
          <button
            key={o} onClick={() => onChange(o)}
            className={cn(
              "flex-1 px-2 py-1.5 text-xs transition-colors",
              i > 0 && "border-l border-atlas-border",
              value === o ? "bg-atlas-accent text-white" : "bg-atlas-bg text-atlas-text-dim hover:bg-atlas-surface-hover"
            )}
          >
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function CreatureLabPage() {
  const toast = useToast();

  // Creature attributes
  const [creatureType, setCreatureType] = useState("monster");
  const [animalReference, setAnimalReference] = useState("");
  const [bodySize, setBodySize] = useState("medium");
  const [mouthType, setMouthType] = useState("fangs");
  const [breathTexture, setBreathTexture] = useState("");
  const [pitchRegister, setPitchRegister] = useState("mid");
  const [speed, setSpeed] = useState("moderate");
  const [aggressionLevel, setAggressionLevel] = useState("alert");
  const [wetDry, setWetDry] = useState("neutral");
  const [distance, setDistance] = useState("near");
  const [acousticSpace, setAcousticSpace] = useState("open cave");
  const [realismLevel, setRealismLevel] = useState("realistic");
  const [layerRole, setLayerRole] = useState("main");
  const [apiRoute, setApiRoute] = useState("creature_sfx");
  const [promptText, setPromptText] = useState("");
  const [loading, setLoading] = useState(false);
  const [voiceDescription, setVoiceDescription] = useState("");
  const [voiceId, setVoiceId] = useState("");
  // Non-human dimensions
  const [elementalAffinity, setElementalAffinity] = useState("none");
  const [magicalArchetype, setMagicalArchetype] = useState("none");
  const [sciFiVector, setSciFiVector] = useState("none");
  const [animalTaxonomy, setAnimalTaxonomy] = useState("none");
  const [powerForce, setPowerForce] = useState("none");
  const [dynamic, setDynamic] = useState("alert");
  const [lens, setLens] = useState<LensDef["id"]>("balanced");
  // Category tab state
  const [activeTab, setActiveTab] = useState<CategoryTabId>("magic");

  const applyLens = useCallback((id: LensDef["id"]) => {
    setLens(id);
    const def = LENS_DEFS.find((l) => l.id === id);
    if (!def || def.id === "balanced") return;
    setCreatureType(def.preset.creatureType);
    setMagicalArchetype(def.preset.magicalArchetype);
    setSciFiVector(def.preset.sciFiVector);
    setElementalAffinity(def.preset.elementalAffinity);
    setAnimalTaxonomy(def.preset.animalTaxonomy);
    setPowerForce(def.preset.powerForce);
  }, []);

  const activeLens = LENS_DEFS.find((l) => l.id === lens) ?? LENS_DEFS[0];

  // Voice engine settings
  const [ttsModel, setTtsModel] = useState("eleven_v3");
  const [voiceStability, setVoiceStability] = useState(0.5);
  const [voiceSimilarity, setVoiceSimilarity] = useState(0.75);
  const [voiceStyle, setVoiceStyle] = useState(0.3);
  const [voiceSpeed, setVoiceSpeed] = useState(1.0);
  const [voiceGuidance, setVoiceGuidance] = useState(0.5);

  // Multi-layer state
  const [layers, setLayers] = useState<CreatureLayer[]>([]);
  const [combining, setCombining] = useState(false);
  const [combinedResult, setCombinedResult] = useState<{ audioUrl: string; characterCost: number } | null>(null);

  // Numeric values for sliders
  const bodySizeIdx = BODY_SIZES.indexOf(bodySize);
  const pitchIdx = PITCH_REGISTERS.indexOf(pitchRegister);
  const speedIdx = SPEEDS.indexOf(speed);
  const aggressionIdx = AGGRESSION_LEVELS.indexOf(aggressionLevel);
  const wetDryIdx = WET_DRY.indexOf(wetDry);
  const distanceIdx = DISTANCES.indexOf(distance);

  // Auto-compose prompt — lens phrase prepended when a lens is active.
  const composedPrompt = [
    activeLens.phrase,
    distance, creatureType || "creature",
    animalReference ? `(${animalReference}-like)` : "",
    bodySize, mouthType ? `${mouthType} mouth` : "",
    breathTexture ? `${breathTexture} breath` : "",
    pitchRegister, speed, aggressionLevel, dynamic,
    wetDry !== "neutral" ? `${wetDry} texture` : "",
    elementalAffinity !== "none" ? `${elementalAffinity}-elemental` : "",
    magicalArchetype !== "none" ? `${magicalArchetype.replace(/_/g, " ")} archetype` : "",
    sciFiVector !== "none" ? `${sciFiVector.replace(/_/g, " ")} vector` : "",
    animalTaxonomy !== "none" ? `${animalTaxonomy.replace(/_/g, " ")} taxonomy` : "",
    powerForce !== "none" ? `with ${powerForce.replace(/_/g, " ")} power` : "",
    `in ${acousticSpace}`, realismLevel,
  ].filter(Boolean).join(" ");

  const finalPrompt = promptText || composedPrompt;

  const isSfx = apiRoute === "creature_sfx";
  const isTts = apiRoute === "tts_creature_layer";
  const isVoiceDesign = apiRoute === "voice_design_preview";

  const handleGenerate = useCallback(async () => {
    setLoading(true);
    const layerId = `layer-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const routeConfig = API_ROUTES.find((r) => r.value === apiRoute);
    const endpoint = routeConfig?.endpoint ?? "/api/elevenlabs/generate-creature-layer";

    // Add layer to rack immediately
    const newLayer: CreatureLayer = {
      id: layerId,
      role: layerRole,
      apiRoute,
      prompt: finalPrompt.slice(0, 80),
      audioUrl: null,
      status: "generating",
    };
    setLayers((prev) => [...prev, newLayer]);

    try {
      let body: Record<string, unknown>;
      if (isTts) {
        if (!voiceId.trim()) { toast.error("Voice ID required"); setLoading(false); setLayers((prev) => prev.filter((l) => l.id !== layerId)); return; }
        body = {
          text: finalPrompt, voice_id: voiceId, creature_type: creatureType, layer_role: layerRole,
          model_id: ttsModel,
          voice_settings: { stability: voiceStability, similarity_boost: voiceSimilarity, style: voiceStyle, use_speaker_boost: true },
        };
      } else if (isVoiceDesign) {
        if (!voiceDescription.trim()) { toast.error("Voice description required"); setLoading(false); setLayers((prev) => prev.filter((l) => l.id !== layerId)); return; }
        body = { voice_description: voiceDescription, text: finalPrompt || "The creature growls menacingly.", guidance: voiceGuidance };
      } else {
        body = {
          text: finalPrompt, creature_type: creatureType, animal_reference: animalReference,
          body_size: bodySize, mouth_type: mouthType, breath_texture: breathTexture,
          pitch_register: pitchRegister, speed, aggression_level: aggressionLevel,
          wet_dry_texture: wetDry, distance, acoustic_space: acousticSpace,
          realism_level: realismLevel, layer_role: layerRole,
          elemental_affinity: elementalAffinity,
          magical_archetype: magicalArchetype,
          sci_fi_vector: sciFiVector,
          animal_taxonomy: animalTaxonomy,
          power_force: powerForce,
          dynamic,
          exclusion_constraints: ["no music", "no dialogue", "no cartoon tone"],
        };
      }

      const res = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();

      if (!res.ok) {
        setLayers((prev) => prev.map((l) => l.id === layerId ? { ...l, status: "error" as const, error: data.error } : l));
        toast.error(data.error || "Generation failed");
      } else {
        setLayers((prev) => prev.map((l) => l.id === layerId ? {
          ...l,
          status: "done" as const,
          audioUrl: data.audioUrl,
          characterCost: data.characterCost,
        } : l));
        toast.success(`Layer generated (${layerRole})`);
      }
    } catch {
      setLayers((prev) => prev.map((l) => l.id === layerId ? { ...l, status: "error" as const, error: "Network error" } : l));
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  }, [finalPrompt, creatureType, animalReference, bodySize, mouthType, breathTexture, pitchRegister, speed, aggressionLevel, wetDry, distance, acousticSpace, realismLevel, layerRole, apiRoute, voiceId, voiceDescription, isTts, isVoiceDesign, toast, elementalAffinity, magicalArchetype, sciFiVector, animalTaxonomy, powerForce, dynamic, ttsModel, voiceGuidance, voiceSimilarity, voiceStability, voiceStyle]);

  const removeLayer = useCallback((id: string) => {
    setLayers((prev) => prev.filter((l) => l.id !== id));
  }, []);

  const handleCombine = useCallback(async () => {
    const doneLayers = layers.filter((l) => l.status === "done");
    if (doneLayers.length < 2) return;
    setCombining(true);

    // Compose a merged prompt from all layer descriptions
    const mergedPrompt = `Full creature sound design combining ${doneLayers.length} layers: ${doneLayers.map((l) => `[${l.role}] ${l.prompt}`).join("; ")}. Create a unified, cohesive creature sound that blends all these elements naturally.`;

    try {
      const res = await fetch("/api/elevenlabs/generate-creature-layer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: mergedPrompt,
          creature_type: creatureType,
          body_size: bodySize,
          pitch_register: pitchRegister,
          layer_role: "main",
          exclusion_constraints: ["no music", "no dialogue"],
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Combine failed");
      } else {
        setCombinedResult({ audioUrl: data.audioUrl, characterCost: data.characterCost });
        toast.success("Layers combined into final creature");
      }
    } catch { toast.error("Network error"); }
    finally { setCombining(false); }
  }, [layers, creatureType, bodySize, pitchRegister, toast]);

  return (
    <div className="p-4 pt-2 max-w-7xl mx-auto animate-fade-in">

      {/* Lens picker + mode toggle on the same row — lens on the left,
          SFX / TTS / Voice Design on the right so a designer can switch
          intent without scanning down the page. */}
      {/* Lens picker — full width above the grid */}
      <div className="mb-4 flex items-center gap-3 flex-wrap">
        <span className="text-xs font-semibold uppercase tracking-wider text-atlas-text-dim shrink-0">Lens</span>
        <div className="flex flex-wrap gap-1.5">
          {LENS_DEFS.map((l) => {
            const Icon = l.icon;
            const active = lens === l.id;
            return (
              <button
                key={l.id}
                onClick={() => applyLens(l.id)}
                className={cn(
                  "flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all",
                  active ? "shadow-sm" : ""
                )}
                style={{
                  borderColor: active ? `hsl(${l.hue}, 55%, 55%)` : "var(--color-atlas-border-subtle)",
                  backgroundColor: active ? `hsla(${l.hue}, 50%, 50%, 0.15)` : "transparent",
                  color: active ? `hsl(${l.hue}, 55%, 55%)` : "var(--color-atlas-text-muted)",
                }}
              >
                <Icon className="h-3.5 w-3.5" />
                {l.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* ═══ Left column: Controls ═══ */}
        <div className="lg:col-span-2 space-y-5">

          {/* Engine toggle — sits at the top of the left column, right-aligned */}
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-atlas-text-dim">Creature Type</span>
            <div className="flex rounded-lg overflow-hidden border border-atlas-border">
              {API_ROUTES.map((r, i) => {
                const isActive = apiRoute === r.value;
                return (
                  <button
                    key={r.value}
                    onClick={() => setApiRoute(r.value)}
                    className={cn(
                      "px-3 py-1.5 text-xs font-medium transition-colors",
                      i > 0 && "border-l border-atlas-border",
                      isActive
                        ? "bg-atlas-accent text-white"
                        : "bg-atlas-surface text-atlas-text-muted hover:text-atlas-text hover:bg-atlas-surface-hover"
                    )}
                  >
                    {r.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Creature type pills */}
          <div className="flex flex-wrap gap-1.5" data-stagger>
            {CREATURE_TYPES.map((t) => {
              const hue = TYPE_HUES[t] ?? 0;
              const isActive = creatureType === t;
              return (
                <button
                  key={t} onClick={() => setCreatureType(t)}
                  className={cn("rounded-full px-3 py-1 text-xs font-medium transition-all duration-200 hover:scale-105 active:scale-95",
                    isActive ? "ring-1 shadow-sm" : "")}
                  style={{
                    backgroundColor: isActive ? `hsla(${hue}, 45%, 45%, 0.15)` : "var(--color-atlas-surface)",
                    border: `1px solid ${isActive ? `hsla(${hue}, 50%, 50%, 0.35)` : "var(--color-atlas-border-subtle)"}`,
                    color: isActive ? `hsl(${hue}, 55%, 55%)` : "var(--color-atlas-text-muted)",
                    ...(isActive ? { boxShadow: `0 0 10px hsla(${hue}, 45%, 45%, 0.15)` } : {}),
                  }}
                >
                  {t}
                </button>
              );
            })}
          </div>

          {/* Sliders — condensed into a single 3-col card so all six
              dimensions stay on screen without scrolling. */}
          {isSfx && (
            <div className="atlas-card p-3 grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3">
              <AtlasSlider label="Body Size" value={bodySizeIdx} onChange={(v) => setBodySize(BODY_SIZES[v] ?? "medium")}
                min={0} max={BODY_SIZES.length - 1} step={1} displayValue={bodySize} lowLabel="tiny" highLabel="colossal" />
              <AtlasSlider label="Pitch" value={pitchIdx} onChange={(v) => setPitchRegister(PITCH_REGISTERS[v] ?? "mid")}
                min={0} max={PITCH_REGISTERS.length - 1} step={1} displayValue={pitchRegister} lowLabel="sub" highLabel="ultra" />
              <AtlasSlider label="Speed" value={speedIdx} onChange={(v) => setSpeed(SPEEDS[v] ?? "moderate")}
                min={0} max={SPEEDS.length - 1} step={1} displayValue={speed} lowLabel="slow" highLabel="erratic" />
              <AtlasSlider label="Aggression" value={aggressionIdx} onChange={(v) => setAggressionLevel(AGGRESSION_LEVELS[v] ?? "alert")}
                min={0} max={AGGRESSION_LEVELS.length - 1} step={1} displayValue={aggressionLevel} lowLabel="passive" highLabel="frenzy" />
              <AtlasSlider label="Wet/Dry" value={wetDryIdx} onChange={(v) => setWetDry(WET_DRY[v] ?? "neutral")}
                min={0} max={WET_DRY.length - 1} step={1} displayValue={wetDry} lowLabel="dry" highLabel="dripping" />
              <AtlasSlider label="Distance" value={distanceIdx} onChange={(v) => setDistance(DISTANCES[v] ?? "near")}
                min={0} max={DISTANCES.length - 1} step={1} displayValue={distance} lowLabel="close" highLabel="far" />
            </div>
          )}

          {/* Pill selectors */}
          {isSfx && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <PillSelect label="Mouth/Throat" value={mouthType} onChange={setMouthType} options={MOUTH_TYPES} />
              <PillSelect label="Acoustic Space" value={acousticSpace} onChange={setAcousticSpace} options={SPACES} />
            </div>
          )}

          {/* ═══ Category modules — tabbed interface ═══ */}
          {isSfx && (
            <div className="space-y-3">
              {/* Tab bar */}
              <div className="flex gap-1 border-b border-atlas-border pb-0">
                {CATEGORY_TABS.map((tab) => {
                  const TabIcon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors -mb-px",
                        isActive
                          ? "border-b-2 border-atlas-accent text-atlas-text"
                          : "text-atlas-text-muted hover:text-atlas-text"
                      )}
                    >
                      <TabIcon className="h-3.5 w-3.5" />
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              {/* Tab content */}
              <div className="pt-1">
                {activeTab === "magic" && (
                  <div
                    className={cn(
                      "rounded-2xl border bg-atlas-surface p-4 space-y-3 transition-colors",
                      activeLens.primarySection === "magic" ? "ring-1" : ""
                    )}
                    style={{
                      borderColor: activeLens.primarySection === "magic" ? `hsla(280, 55%, 55%, 0.55)` : "var(--color-atlas-border-subtle)",
                      boxShadow: activeLens.primarySection === "magic" ? `0 0 0 1px hsla(280, 55%, 55%, 0.3) inset` : undefined,
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <div className="flex h-6 w-6 items-center justify-center rounded-lg shrink-0" style={{ backgroundColor: `hsla(280, 50%, 50%, 0.15)` }}>
                        <Wand2 className="h-3.5 w-3.5" style={{ color: `hsl(280, 55%, 55%)` }} />
                      </div>
                      <span className="text-xs font-semibold uppercase tracking-wider text-atlas-text-dim">Magic</span>
                      {activeLens.primarySection === "magic" && (
                        <span className="text-[10px] font-semibold uppercase tracking-wider rounded px-1.5 py-0.5" style={{ backgroundColor: `hsla(280, 50%, 50%, 0.2)`, color: `hsl(280, 55%, 55%)` }}>primary</span>
                      )}
                      <span className="text-[10px] text-atlas-text-dim ml-auto truncate">Archetype, ritual style, casting flavor.</span>
                    </div>
                    <PillSelect label="Magical Archetype" value={magicalArchetype} onChange={setMagicalArchetype} options={MAGICAL_ARCHETYPES} />
                  </div>
                )}

                {activeTab === "scifi" && (
                  <div
                    className={cn(
                      "rounded-2xl border bg-atlas-surface p-4 space-y-3 transition-colors",
                      activeLens.primarySection === "scifi" ? "ring-1" : ""
                    )}
                    style={{
                      borderColor: activeLens.primarySection === "scifi" ? `hsla(200, 55%, 55%, 0.55)` : "var(--color-atlas-border-subtle)",
                      boxShadow: activeLens.primarySection === "scifi" ? `0 0 0 1px hsla(200, 55%, 55%, 0.3) inset` : undefined,
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <div className="flex h-6 w-6 items-center justify-center rounded-lg shrink-0" style={{ backgroundColor: `hsla(200, 50%, 50%, 0.15)` }}>
                        <Rocket className="h-3.5 w-3.5" style={{ color: `hsl(200, 55%, 55%)` }} />
                      </div>
                      <span className="text-xs font-semibold uppercase tracking-wider text-atlas-text-dim">Sci-fi</span>
                      {activeLens.primarySection === "scifi" && (
                        <span className="text-[10px] font-semibold uppercase tracking-wider rounded px-1.5 py-0.5" style={{ backgroundColor: `hsla(200, 50%, 50%, 0.2)`, color: `hsl(200, 55%, 55%)` }}>primary</span>
                      )}
                      <span className="text-[10px] text-atlas-text-dim ml-auto truncate">Synthetic, biomech, swarm, extraterrestrial, parasitic.</span>
                    </div>
                    <PillSelect label="Sci-fi Vector" value={sciFiVector} onChange={setSciFiVector} options={SCI_FI_VECTORS} />
                  </div>
                )}

                {activeTab === "elemental" && (
                  <div
                    className={cn(
                      "rounded-2xl border bg-atlas-surface p-4 space-y-3 transition-colors",
                      activeLens.primarySection === "elemental" ? "ring-1" : ""
                    )}
                    style={{
                      borderColor: activeLens.primarySection === "elemental" ? `hsla(0, 55%, 55%, 0.55)` : "var(--color-atlas-border-subtle)",
                      boxShadow: activeLens.primarySection === "elemental" ? `0 0 0 1px hsla(0, 55%, 55%, 0.3) inset` : undefined,
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <div className="flex h-6 w-6 items-center justify-center rounded-lg shrink-0" style={{ backgroundColor: `hsla(0, 50%, 50%, 0.15)` }}>
                        <Flame className="h-3.5 w-3.5" style={{ color: `hsl(0, 55%, 55%)` }} />
                      </div>
                      <span className="text-xs font-semibold uppercase tracking-wider text-atlas-text-dim">Elemental</span>
                      {activeLens.primarySection === "elemental" && (
                        <span className="text-[10px] font-semibold uppercase tracking-wider rounded px-1.5 py-0.5" style={{ backgroundColor: `hsla(0, 50%, 50%, 0.2)`, color: `hsl(0, 55%, 55%)` }}>primary</span>
                      )}
                      <span className="text-[10px] text-atlas-text-dim ml-auto truncate">Forces of nature — fire, water, earth, air, void, lightning, ice.</span>
                    </div>
                    <PillSelect label="Elemental Affinity" value={elementalAffinity} onChange={setElementalAffinity} options={ELEMENTAL_AFFINITIES} />
                  </div>
                )}

                {activeTab === "fauna" && (
                  <div
                    className={cn(
                      "rounded-2xl border bg-atlas-surface p-4 space-y-3 transition-colors",
                      activeLens.primarySection === "fauna" ? "ring-1" : ""
                    )}
                    style={{
                      borderColor: activeLens.primarySection === "fauna" ? `hsla(130, 55%, 55%, 0.55)` : "var(--color-atlas-border-subtle)",
                      boxShadow: activeLens.primarySection === "fauna" ? `0 0 0 1px hsla(130, 55%, 55%, 0.3) inset` : undefined,
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <div className="flex h-6 w-6 items-center justify-center rounded-lg shrink-0" style={{ backgroundColor: `hsla(130, 50%, 50%, 0.15)` }}>
                        <Fish className="h-3.5 w-3.5" style={{ color: `hsl(130, 55%, 55%)` }} />
                      </div>
                      <span className="text-xs font-semibold uppercase tracking-wider text-atlas-text-dim">Fauna</span>
                      {activeLens.primarySection === "fauna" && (
                        <span className="text-[10px] font-semibold uppercase tracking-wider rounded px-1.5 py-0.5" style={{ backgroundColor: `hsla(130, 50%, 50%, 0.2)`, color: `hsl(130, 55%, 55%)` }}>primary</span>
                      )}
                      <span className="text-[10px] text-atlas-text-dim ml-auto truncate">Animal taxonomy — apex predator, prey, swarm, aquatic, avian, reptilian.</span>
                    </div>
                    <PillSelect label="Animal Taxonomy" value={animalTaxonomy} onChange={setAnimalTaxonomy} options={ANIMAL_TAXONOMIES} />
                  </div>
                )}

                {activeTab === "powers" && (
                  <div
                    className="rounded-2xl border bg-atlas-surface p-4 space-y-3 transition-colors"
                    style={{ borderColor: "var(--color-atlas-border-subtle)" }}
                  >
                    <div className="flex items-center gap-2">
                      <div className="flex h-6 w-6 items-center justify-center rounded-lg shrink-0" style={{ backgroundColor: `hsla(45, 50%, 50%, 0.15)` }}>
                        <Bug className="h-3.5 w-3.5" style={{ color: `hsl(45, 55%, 55%)` }} />
                      </div>
                      <span className="text-xs font-semibold uppercase tracking-wider text-atlas-text-dim">Powers · Dynamics</span>
                      <span className="text-[10px] text-atlas-text-dim ml-auto truncate">The creature&apos;s powers, forces and behavioral mode at this moment.</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <PillSelect label="Power / Force" value={powerForce} onChange={setPowerForce} options={POWERS_FORCES} />
                      <PillSelect label="Dynamic" value={dynamic} onChange={setDynamic} options={DYNAMICS} />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Segmented toggles */}
          {isSfx && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <SegmentedToggle label="Realism" value={realismLevel} onChange={setRealismLevel} options={REALISM_LEVELS} />
              <SegmentedToggle label="Layer Role" value={layerRole} onChange={setLayerRole} options={LAYER_ROLES} />
            </div>
          )}

          {/* Free-text inputs */}
          {isSfx && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-atlas-text-dim mb-1">Animal Reference</label>
                <input value={animalReference} onChange={(e) => setAnimalReference(e.target.value)}
                  placeholder="e.g. komodo dragon"
                  className="w-full rounded-lg border border-atlas-border bg-atlas-bg px-3 py-1.5 text-xs text-atlas-text placeholder-atlas-text-dim focus:border-atlas-accent focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-atlas-text-dim mb-1">Breath Texture</label>
                <input value={breathTexture} onChange={(e) => setBreathTexture(e.target.value)}
                  placeholder="e.g. raspy, shallow"
                  className="w-full rounded-lg border border-atlas-border bg-atlas-bg px-3 py-1.5 text-xs text-atlas-text placeholder-atlas-text-dim focus:border-atlas-accent focus:outline-none" />
              </div>
            </div>
          )}

          {/* TTS Vocal Layer — expanded voice engine */}
          {isTts && (
            <div className="atlas-card p-4 space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-atlas-text-dim">Voice Engine — Vocal Layer</h3>

              {/* Voice ID */}
              <div>
                <label className="block text-xs font-medium text-atlas-text-dim mb-1">Voice ID</label>
                <input value={voiceId} onChange={(e) => setVoiceId(e.target.value)}
                  placeholder="ElevenLabs voice ID"
                  className="w-full rounded-lg border border-atlas-border bg-atlas-bg px-3 py-2 text-xs text-atlas-text placeholder-atlas-text-dim font-mono focus:border-atlas-accent focus:outline-none" />
              </div>

              {/* TTS Model — segmented toggle replacing select */}
              <SegmentedToggle
                label="Model"
                value={ttsModel}
                onChange={setTtsModel}
                options={["eleven_v3", "eleven_multilingual_v2", "eleven_flash_v2_5"]}
              />

              {/* Voice settings — 4-col grid keeps all four knobs on one row. */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-3">
                <AtlasSlider label="Stability" value={voiceStability} onChange={setVoiceStability}
                  min={0} max={1} step={0.05} displayValue={`${Math.round(voiceStability * 100)}%`}
                  lowLabel="expressive" highLabel="stable" />
                <AtlasSlider label="Clarity" value={voiceSimilarity} onChange={setVoiceSimilarity}
                  min={0} max={1} step={0.05} displayValue={`${Math.round(voiceSimilarity * 100)}%`}
                  lowLabel="diverge" highLabel="faithful" />
                <AtlasSlider label="Style" value={voiceStyle} onChange={setVoiceStyle}
                  min={0} max={1} step={0.05} displayValue={`${Math.round(voiceStyle * 100)}%`}
                  lowLabel="subtle" highLabel="extra" />
                <AtlasSlider label="Speed" value={voiceSpeed} onChange={setVoiceSpeed}
                  min={0.5} max={2} step={0.1} displayValue={`${voiceSpeed.toFixed(1)}x`}
                  lowLabel="slow" highLabel="fast" />
              </div>

              {/* Expression direction presets */}
              <div>
                <label className="block text-xs font-medium text-atlas-text-dim mb-1.5">Expression Direction</label>
                <div className="flex flex-wrap gap-1">
                  {VOICE_EXPRESSIONS.map((expr) => (
                    <button
                      key={expr.id}
                      onClick={() => setPromptText(expr.prompt)}
                      className="rounded-full border border-atlas-border-subtle bg-atlas-bg px-2.5 py-1 text-xs text-atlas-text-dim hover:text-atlas-accent hover:border-atlas-accent/30 transition-colors"
                      title={expr.description}
                    >
                      {expr.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Script textarea */}
              <div>
                <label className="block text-xs font-medium text-atlas-text-dim mb-1">Script / Dialogue</label>
                <textarea value={promptText || ""} onChange={(e) => setPromptText(e.target.value)}
                  placeholder="Write the creature dialogue or vocalizations here... e.g. '*deep rumbling growl* Who dares enter my domain...'"
                  rows={3} className="w-full rounded-lg border border-atlas-border bg-atlas-bg px-3 py-2 text-xs text-atlas-text placeholder-atlas-text-dim resize-none focus:border-atlas-accent focus:outline-none" />
              </div>

              <SegmentedToggle label="Layer Role" value={layerRole} onChange={setLayerRole} options={LAYER_ROLES} />
            </div>
          )}

          {/* Voice Design — create new voices from description */}
          {isVoiceDesign && (
            <div className="atlas-card p-4 space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-atlas-text-dim">Voice Designer — Create Creature Voice</h3>

              {/* Voice description templates */}
              <div>
                <label className="block text-xs font-medium text-atlas-text-dim mb-1.5">Creature Voice Templates</label>
                <div className="grid grid-cols-2 gap-1">
                  {VOICE_DESIGN_TEMPLATES.map((tmpl) => (
                    <button
                      key={tmpl.id}
                      onClick={() => setVoiceDescription(tmpl.description)}
                      className="rounded-lg border border-atlas-border-subtle bg-atlas-bg px-2.5 py-2 text-left hover:border-atlas-accent/30 transition-colors group"
                    >
                      <span className="text-xs font-medium text-atlas-text-muted group-hover:text-atlas-accent transition-colors">{tmpl.label}</span>
                      <p className="text-xs text-atlas-text-dim leading-tight mt-0.5 line-clamp-2">{tmpl.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Voice description */}
              <div>
                <label className="block text-xs font-medium text-atlas-text-dim mb-1">Voice Description (20–1000 chars)</label>
                <textarea value={voiceDescription} onChange={(e) => setVoiceDescription(e.target.value)}
                  placeholder="Describe the creature's voice in detail: timbre, age, size, emotional quality, accent, texture..."
                  rows={4} className="w-full rounded-lg border border-atlas-border bg-atlas-bg px-3 py-2 text-xs text-atlas-text placeholder-atlas-text-dim resize-none focus:border-atlas-accent focus:outline-none" />
                <div className="text-xs text-atlas-text-dim mt-0.5">{voiceDescription.length} / 1000</div>
              </div>

              {/* Guidance slider */}
              <AtlasSlider label="Guidance Scale" value={voiceGuidance} onChange={setVoiceGuidance}
                min={0} max={1} step={0.05} displayValue={`${Math.round(voiceGuidance * 100)}%`}
                lowLabel="creative" highLabel="strict" />

              {/* Preview text */}
              <div>
                <label className="block text-xs font-medium text-atlas-text-dim mb-1">Preview Text</label>
                <textarea value={promptText || ""} onChange={(e) => setPromptText(e.target.value)}
                  placeholder="Text for the voice to speak... e.g. 'The ancient beast awakens from its slumber beneath the mountain.'"
                  rows={2} className="w-full rounded-lg border border-atlas-border bg-atlas-bg px-3 py-2 text-xs text-atlas-text placeholder-atlas-text-dim resize-none focus:border-atlas-accent focus:outline-none" />
              </div>
            </div>
          )}

          {/* Layer Rack */}
          <LayerRack
            layers={layers}
            onRemoveLayer={removeLayer}
            onCombine={handleCombine}
            combining={combining}
            combinedResult={combinedResult}
          />
        </div>

        {/* ═══ Right panel: Prompt + Generate + Controls ═══ */}
        <div className="lg:col-span-1 sticky top-4 self-start space-y-4 max-h-[calc(100vh-5rem)] overflow-y-auto pr-1">

          {/* Prompt card — styled to match /generate sidebar. */}
          <div className="atlas-card p-4">
            <textarea
              value={promptText || composedPrompt}
              onChange={(e) => setPromptText(e.target.value)}
              rows={5}
              placeholder="Describe the creature sound you want to generate..."
              className="w-full rounded-xl border border-atlas-border bg-atlas-bg px-3.5 py-3 text-sm leading-relaxed text-atlas-text placeholder-atlas-text-muted focus:outline-none resize-none"
              data-no-transition
            />
            <div className="flex items-center justify-between text-xs text-atlas-text-muted mt-1.5">
              <span className={cn("tabular-nums", (promptText || composedPrompt).length > 450 ? "text-atlas-danger font-medium" : "")}>
                {(promptText || composedPrompt).length} chars
              </span>
              {promptText && (
                <button
                  onClick={() => setPromptText("")}
                  className="rounded-md p-1 text-atlas-text-dim hover:text-atlas-text hover:bg-atlas-surface-hover transition-colors"
                  title="Reset to auto-composed"
                >
                  ↺
                </button>
              )}
            </div>
          </div>

          {/* Generate button — same shape as /generate. */}
          <button
            onClick={handleGenerate}
            disabled={loading}
            className={cn(
              "w-full rounded-xl py-4 text-sm font-semibold transition-all duration-200",
              loading
                ? "bg-atlas-surface-hover text-atlas-text-dim cursor-not-allowed"
                : "bg-atlas-accent text-white hover:bg-atlas-accent-hover hover:shadow-lg hover:shadow-atlas-accent/20 active:scale-[0.99]"
            )}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-3">
                <span className="flex gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <span key={i} className="waveform-bar" />
                  ))}
                </span>
                Generating...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <Plus className="h-4 w-4" /> Generate Layer ({layerRole})
              </span>
            )}
          </button>

          {/* Controls card — remaining settings */}
          <div className="atlas-card p-3 space-y-3">
            <SegmentedToggle label="Layer Role" value={layerRole} onChange={setLayerRole} options={LAYER_ROLES} />
            <SegmentedToggle label="Realism" value={realismLevel} onChange={setRealismLevel} options={REALISM_LEVELS} />
          </div>
        </div>
      </div>
    </div>
  );
}
