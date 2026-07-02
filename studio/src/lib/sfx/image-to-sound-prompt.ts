/**
 * Algophony Studio — Image-to-Sound Prompt Builders
 *
 * Prompts for Gemini Flash to interpret images into structured Algophony Studio
 * sound design plans, and utilities to parse the output.
 */

import type { ImageAnalysis, InterpretationMode, UseCase } from "./image-to-sound-taxonomy";

export function buildVisionAnalysisPrompt(
  mode: InterpretationMode,
  useCase: UseCase
): string {
  let modeInstructions = "";

  switch (mode) {
    case "literal":
      modeInstructions = "Focus ONLY on direct physical sounds. What objects are hitting what? What literal acoustic events are happening? No emotional layers, no music.";
      break;
    case "cinematic":
      modeInstructions = "Design like a Hollywood supervising sound editor. Focus on tension, dramatic layering, hidden off-screen presence, sub-bass pressure, and hyper-real Foley.";
      break;
    case "game_ready":
      modeInstructions = "Design for game audio. Focus on loopable ambient beds, surface interaction sets (footsteps/impacts), and distinct readable cues for mechanics.";
      break;
    case "cartoon":
      modeInstructions = "Design for classic or modern animation. Exaggerated, playful, bouncy, and highly stylized. Synthesized boings, zips, and musical sound effects.";
      break;
    case "experimental":
      modeInstructions = "Design like a sound artist or experimental film. Abstract textures, spectral shifts, dreamlike interpretations, and unrecognizable processed Foley.";
      break;
    case "atmospheric":
      modeInstructions = "Focus heavily on environmental beds, immersive spaces, wind/air tones, and subtle ecology. De-prioritize foreground action.";
      break;
    case "foley_focused":
      modeInstructions = "Zoom in on physical gestures, cloth rustles, material handling, object contacts, and human/creature physical movement. Ignore background ambience.";
      break;
    case "creature_focused":
      modeInstructions = "Focus on creature vocals, breathing, skin textures, movement, roars, clicks, or alien language. Ignore environment unless it interacts with the creature.";
      break;
    case "ui_branding":
      modeInstructions = "Treat this as a UI mockup or brand asset. Design interface taps, toggles, notifications, success/error states, and short sonic logos.";
      break;
  }

  return `You are an expert, award-winning sound designer and supervising sound editor.
Your task is to analyze an image and translate its visual elements into a professional sound design plan.

CONTEXT
Interpretation Mode: ${mode}
Target Use Case: ${useCase}

MODE INSTRUCTIONS
${modeInstructions}

OUTPUT FORMAT
You must respond with valid JSON matching this schema:

{
  "imageSummary": "1-2 sentences describing the image visually.",
  "visualElements": [
    {
      "element": "name of visible object/event",
      "sonicPotential": "comma-separated list of possible sounds",
      "category": "Atmosphere | Foley | UI | Action | Material"
    }
  ],
  "impliedActions": ["action1", "action2"],
  "acousticSpace": "description of the implied reverb/room size",
  "materialTextures": ["glass", "wet concrete", etc],
  "mood": {
    "primary": "core emotion",
    "secondary": ["adj1", "adj2"]
  },
  "suggestedStrategy": "layered_atmosphere | foley_set | ui_sound_set | creature_set | game_ambience | single_sound",
  "foregroundSounds": ["sound1", "sound2"],
  "backgroundSounds": ["sound1", "sound2"],
  "ambienceLayers": ["bed1", "bed2"],
  "foleyLayers": ["foley1", "foley2"],
  "specialSounds": ["ui/creature/magic/etc"],
  "exclusions": ["sounds to actively avoid based on image/mode"],
  "soundCards": [
    {
      "title": "Short descriptive title",
      "category": "Atmosphere | Foley | UI | Creature | Synth | Generic",
      "layerRole": "foreground | midground | background | space | texture | emotion | micro_events | base_bed",
      "visualSource": "What specific part of the image inspired this?",
      "prompt": "A highly detailed, comma-separated prompt for an AI sound generator (ElevenLabs). Focus on acoustic properties, action, material, space, and mood. End with 'no music, no dialogue'. Keep under 400 characters.",
      "durationSeconds": 4,
      "loop": false,
      "promptInfluence": 0.35,
      "exclusions": ["no music", "no dialogue"]
    }
  ],
  "missingInfoQuestions": ["Question to ask the director/user"]
}

CARD GENERATION RULES
- Generate 3 to 8 soundCards depending on the image complexity.
- For atmospheres, create loopable beds (30s) and non-looping micro-events (4s).
- For Foley, focus on specific material interactions.
- Ensure 'prompt' is highly descriptive of the SOUND, not just the image.

Analyze the image and return the JSON. Do not include markdown code blocks, just the raw JSON object.`;
}

/**
 * Fallback mock analysis for development without API keys
 */
export function getMockAnalysis(): ImageAnalysis {
  return {
    imageSummary: "A dark flooded subway tunnel with concrete walls, exposed cables, and dim green emergency lighting.",
    visualElements: [
      { element: "shallow water", sonicPotential: "drips, splashes, wet footsteps", category: "Foley / Ambience" },
      { element: "concrete tunnel", sonicPotential: "reverb, air pressure, low room tone", category: "Atmosphere" },
      { element: "exposed cables", sonicPotential: "electrical buzz, sparks, hum", category: "Action / Props" }
    ],
    impliedActions: ["water dripping", "distant train moving", "electrical sparking"],
    acousticSpace: "Large, long concrete cylinder with heavy slapback reverb and low frequency resonance",
    materialTextures: ["wet concrete", "rusted metal", "stagnant water"],
    mood: {
      primary: "tense",
      secondary: ["abandoned", "humid", "dangerous", "cinematic"]
    },
    suggestedStrategy: "layered_atmosphere",
    foregroundSounds: ["water drips", "spark pop"],
    backgroundSounds: ["tunnel wind", "distant rumble"],
    ambienceLayers: ["base room tone", "wet air pressure", "electrical hum bed"],
    foleyLayers: ["wet boot steps", "metal pipe interaction"],
    specialSounds: ["low synth tension drone"],
    exclusions: ["bright cheerful sounds", "clean dry acoustics", "birds"],
    soundCards: [
      {
        title: "Flooded tunnel base bed",
        category: "Atmosphere",
        layerRole: "base_bed",
        visualSource: "The overall concrete tunnel structure",
        prompt: "Loopable flooded subway tunnel ambience, humid concrete air, distant low rumble, subtle water movement, tense but realistic, no music, no dialogue.",
        durationSeconds: 30,
        loop: true,
        promptInfluence: 0.45,
        exclusions: ["no music", "no dialogue", "no sudden events"]
      },
      {
        title: "Electrical panel buzz",
        category: "Atmosphere",
        layerRole: "texture",
        visualSource: "Exposed cables on the left wall",
        prompt: "Low voltage electrical buzz from a broken wall panel, sputtering, unstable hum, metallic resonance, dark tone, no music.",
        durationSeconds: 15,
        loop: true,
        promptInfluence: 0.3,
        exclusions: ["no music"]
      },
      {
        title: "Water drip echo",
        category: "Foley",
        layerRole: "micro_events",
        visualSource: "Stagnant water on the floor",
        prompt: "Single heavy water drip falling into a shallow puddle, wet concrete reverb, isolated, realistic, no music.",
        durationSeconds: 4,
        loop: false,
        promptInfluence: 0.2,
        exclusions: ["no music", "footsteps"]
      }
    ],
    missingInfoQuestions: [
      "Should this feel realistic or stylized/horror?",
      "Is there an unseen monster in this space?"
    ]
  };
}
