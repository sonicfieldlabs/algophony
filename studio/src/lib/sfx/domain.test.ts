import { describe, it, expect } from "vitest";
import { composePrompt } from "./compose-prompt";
import { criticize } from "./critic";
import { breakdownScene } from "./scene-breakdown";
import { validatePromptAttributes } from "./prompt-schema";
import { suggestMappings, mapRowToAttributes } from "./metadata-map";
import { hasEntitlement } from "./entitlements";
import { canGenerate, debitGeneration, applyLedgerEntry } from "./credits";
import { draftToSoundCard } from "./image-to-sound-taxonomy";
import { ROUTE_DESTINATIONS } from "./route-to-tool";
import type { SfxPromptAttributes } from "./prompt-schema";

// --- Helpers ---
function makeAttrs(overrides: Partial<SfxPromptAttributes> = {}): SfxPromptAttributes {
  return {
    category: "Footsteps",
    sourceObject: "heavy boots",
    action: "walking slowly",
    surface: "wet concrete",
    environment: "empty subway tunnel",
    perspective: "close-mic",
    durationSeconds: 4,
    loop: false,
    promptInfluence: 0.3,
    modelId: "eleven_text_to_sound_v2",
    exclusions: ["no music", "no dialogue", "no cartoon tone"],
    ...overrides,
  };
}

// === Prompt Composer ===
describe("composePrompt", () => {
  it("composes footsteps on wet concrete", () => {
    const prompt = composePrompt(makeAttrs());
    expect(prompt).toContain("close-mic");
    expect(prompt).toContain("heavy boots");
    expect(prompt).toContain("walking slowly");
    expect(prompt).toContain("wet concrete");
    expect(prompt).toContain("subway tunnel");
    expect(prompt).toContain("no music");
    expect(prompt).toContain("no dialogue");
  });

  it("does NOT inline duration in prompt text (goes to API param)", () => {
    const prompt = composePrompt(makeAttrs({ durationSeconds: 2.5 }));
    expect(prompt).not.toMatch(/\d+(\.\d+)?\s*seconds?/i);
  });

  it("does NOT inline loop in prompt text (goes to API param)", () => {
    const prompt = composePrompt(makeAttrs({ loop: true }));
    expect(prompt).not.toContain("seamless loop");
  });

  it("appends use-case to prompt text when provided", () => {
    const prompt = composePrompt(makeAttrs({ useCase: "background ambience" }));
    expect(prompt).toContain("background ambience");
  });

  it("appends exclusions as prompt text", () => {
    const prompt = composePrompt(makeAttrs({ exclusions: ["no cartoon tone", "no melody"] }));
    expect(prompt).toContain("no cartoon tone");
    expect(prompt).toContain("no melody");
  });
});

// === Prompt Critic ===
describe("criticize", () => {
  it("scores a complete prompt as strong", () => {
    const report = criticize(makeAttrs({ mood: "tense" }));
    expect(report.score).toBeGreaterThanOrEqual(75);
    expect(report.grade).toBe("strong");
  });

  it("warns about missing material/action", () => {
    const report = criticize(makeAttrs({ action: undefined, material: undefined, surface: undefined }));
    expect(report.issues.some(i => i.field === "action")).toBe(true);
    expect(report.issues.some(i => i.field === "material/surface")).toBe(true);
  });

  it("returns an improved prompt", () => {
    const report = criticize(makeAttrs({ sourceObject: undefined }));
    expect(report.improvedPrompt.length).toBeGreaterThan(0);
  });
});

// === Prompt Schema Validation ===
describe("validatePromptAttributes", () => {
  it("rejects duration under 0.5", () => {
    const result = validatePromptAttributes({ ...makeAttrs(), durationSeconds: 0.1 });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.some(e => e.includes("0.5"))).toBe(true);
    }
  });

  it("rejects duration over 30", () => {
    const result = validatePromptAttributes({ ...makeAttrs(), durationSeconds: 45 });
    expect(result.success).toBe(false);
  });

  it("validates prompt influence bounds", () => {
    const low = validatePromptAttributes({ ...makeAttrs(), promptInfluence: -0.5 });
    expect(low.success).toBe(false);
    const high = validatePromptAttributes({ ...makeAttrs(), promptInfluence: 1.5 });
    expect(high.success).toBe(false);
  });

  it("accepts valid attributes", () => {
    const result = validatePromptAttributes(makeAttrs());
    expect(result.success).toBe(true);
  });
});

// === Scene Breakdown ===
describe("breakdownScene", () => {
  const DEMO_SCENE = "A creature crawls through a flooded subway tunnel while loose cables spark, rats move behind a metal panel, and a distant train rumbles.";

  it("breaks demo scene into multiple events", () => {
    const events = breakdownScene(DEMO_SCENE);
    expect(events.length).toBeGreaterThanOrEqual(3);
  });

  it("detects creature category", () => {
    const events = breakdownScene(DEMO_SCENE);
    expect(events.some(e => e.category === "Creature")).toBe(true);
  });

  it("detects electricity category", () => {
    const events = breakdownScene(DEMO_SCENE);
    expect(events.some(e => e.category === "Electricity")).toBe(true);
  });

  it("detects vehicle/train category", () => {
    const events = breakdownScene(DEMO_SCENE);
    expect(events.some(e => e.category === "Vehicle")).toBe(true);
  });

  it("generates prompts for each event", () => {
    const events = breakdownScene(DEMO_SCENE);
    for (const e of events) {
      expect(e.generatedPrompt.length).toBeGreaterThan(10);
    }
  });

  it("returns empty for empty input", () => {
    expect(breakdownScene("")).toEqual([]);
  });
});

// === Metadata Mapper ===
describe("metadata-map", () => {
  it("suggests correct mappings for common headers", () => {
    const mapping = suggestMappings(["filename", "description", "category", "duration", "tags"]);
    expect(mapping["filename"]).toBe("filename");
    expect(mapping["description"]).toBe("description");
    expect(mapping["category"]).toBe("category");
    expect(mapping["duration"]).toBe("duration");
    expect(mapping["tags"]).toBe("keywords");
  });

  it("maps a CSV row to prompt attributes", () => {
    const mapping = suggestMappings(["category", "description", "duration", "mood"]);
    const row = { category: "Footsteps", description: "boots on gravel", duration: "3", mood: "tense" };
    const attrs = mapRowToAttributes(row, mapping);
    expect(attrs.category).toBe("Footsteps");
    expect(attrs.sourceObject).toBe("boots on gravel");
    expect(attrs.durationSeconds).toBe(3);
    expect(attrs.mood).toBe("tense");
  });
});

// === Entitlements ===
describe("entitlements", () => {
  it("local compatibility grants metadata import regardless of historical plan", () => {
    expect(hasEntitlement({ plan: "free", entitlements: [] }, "metadata_import")).toBe(true);
  });

  it("historical studio plan still has metadata import", () => {
    expect(hasEntitlement({ plan: "studio", entitlements: [] }, "metadata_import")).toBe(true);
  });

  it("historical creator plan still has prompt browser", () => {
    expect(hasEntitlement({ plan: "creator", entitlements: [] }, "prompt_browser")).toBe(true);
  });
});

// === Credits ===
describe("credits", () => {
  it("canGenerate returns true when credits > 0", () => {
    expect(canGenerate({ creditsRemaining: 3, monthlyLimit: 3 })).toBe(true);
  });

  it("canGenerate returns false when credits = 0", () => {
    expect(canGenerate({ creditsRemaining: 0, monthlyLimit: 3 })).toBe(false);
  });

  it("debit entry subtracts 1 credit", () => {
    const entry = debitGeneration("gen-123");
    expect(entry.delta).toBe(-1);
    const newBalance = applyLedgerEntry(5, entry);
    expect(newBalance).toBe(4);
  });

  it("balance never goes below 0", () => {
    const entry = debitGeneration("gen-123");
    const newBalance = applyLedgerEntry(0, entry);
    expect(newBalance).toBe(0);
  });
});

// === Image to Sound ===
describe("image-to-sound taxonomy", () => {
  it("sanitizes model card drafts before generation", () => {
    const card = draftToSoundCard(
      {
        title: "",
        category: "",
        layerRole: "invalid_role" as never,
        visualSource: "",
        prompt: "",
        durationSeconds: 99,
        loop: true,
        promptInfluence: -1,
        exclusions: [" no music ", ""],
      },
      0
    );

    expect(card.title).toBe("Untitled sound");
    expect(card.category).toBe("Generic");
    expect(card.layerRole).toBe("midground");
    expect(card.visualSource).toBe("Uploaded image");
    expect(card.durationSeconds).toBe(30);
    expect(card.promptInfluence).toBe(0);
    expect(card.exclusions).toEqual(["no music"]);
  });
});

describe("route-to-tool", () => {
  it("routes atmosphere cards to the existing Atmosphere Builder page", () => {
    const atmosphere = ROUTE_DESTINATIONS.find((route) => route.id === "atmosphere_maker");
    expect(atmosphere?.path).toBe("/dashboard/atmosphere-builder");
  });
});
