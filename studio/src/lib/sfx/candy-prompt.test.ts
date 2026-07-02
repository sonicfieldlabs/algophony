import { describe, it, expect } from "vitest";
import {
  buildPushPrompt, buildArtifactPrompt, buildNoisePrompt,
  buildImpactPrompt, buildImpactBandPrompts, estimateMiscCost,
} from "./candy-prompt";
import {
  defaultPushSettings, defaultArtifactSettings, defaultNoiseSettings,
  defaultImpactSettings, defaultImpactBands,
} from "./candy-taxonomy";

describe("buildPushPrompt", () => {
  it("includes type, medium and direction", () => {
    const p = buildPushPrompt(defaultPushSettings());
    expect(p.toLowerCase()).toContain("whoosh");
    expect(p.toLowerCase()).toContain("air");
    expect(p).toContain("L to R");
  });

  it("encodes pitch sweep as upward when positive", () => {
    const p = buildPushPrompt({ ...defaultPushSettings(), pitchSweep: 0.9 });
    expect(p).toContain("strong upward pitch sweep");
  });

  it("encodes pitch sweep as downward when strongly negative", () => {
    const p = buildPushPrompt({ ...defaultPushSettings(), pitchSweep: -0.9 });
    expect(p).toContain("strong downward pitch sweep");
  });

  it("excludes music and dialogue", () => {
    const p = buildPushPrompt(defaultPushSettings());
    expect(p).toContain("no dialogue, no music");
  });

  it("emits doppler bend only when explicit", () => {
    const off = buildPushPrompt({ ...defaultPushSettings(), doppler: false });
    const on  = buildPushPrompt({ ...defaultPushSettings(), doppler: true });
    expect(off).not.toContain("doppler");
    expect(on).toContain("doppler");
  });
});

describe("buildArtifactPrompt", () => {
  it("includes density, type and events-per-second", () => {
    const p = buildArtifactPrompt(defaultArtifactSettings());
    expect(p.toLowerCase()).toContain("scattered");
    expect(p.toLowerCase()).toContain("glitch");
    expect(p).toMatch(/~\d+ events\/sec/);
  });

  it("respects source descriptor", () => {
    const p = buildArtifactPrompt({ ...defaultArtifactSettings(), source: "vinyl crackle" });
    expect(p).toContain("vinyl crackle");
  });

  it("flags heavy bit-crush as aliased", () => {
    const p = buildArtifactPrompt({ ...defaultArtifactSettings(), bitCrush: 0.9 });
    expect(p).toContain("heavily bit-crushed");
  });
});

describe("buildNoisePrompt", () => {
  it("encodes telephone bandwidth", () => {
    const p = buildNoisePrompt(defaultNoiseSettings());
    expect(p.toLowerCase()).toContain("telephone-bandwidth");
  });

  it("propagates tags into the prompt", () => {
    const p = buildNoisePrompt({ ...defaultNoiseSettings(), tags: ["dying speaker", "alien data"] });
    expect(p).toContain("dying speaker");
    expect(p).toContain("alien data");
  });

  it("describes scanning motion", () => {
    const p = buildNoisePrompt({ ...defaultNoiseSettings(), motion: "scanning" });
    expect(p).toContain("scanning across frequencies");
  });
});

describe("buildImpactPrompt", () => {
  it("composes family + situation + target", () => {
    const p = buildImpactPrompt(defaultImpactSettings());
    expect(p.toLowerCase()).toContain("rock");
    expect(p.toLowerCase()).toContain("drop");
    expect(p.toLowerCase()).toContain("concrete floor");
  });

  it("encodes cinematic sub-drop tail", () => {
    const p = buildImpactPrompt({ ...defaultImpactSettings(), tail: "cinematic_sub_drop" });
    expect(p).toContain("cinematic sub-drop");
  });
});

describe("buildImpactBandPrompts", () => {
  it("returns an empty array when layeredDesign is off", () => {
    const out = buildImpactBandPrompts({ ...defaultImpactSettings(), layeredDesign: false });
    expect(out).toEqual([]);
  });

  it("returns one prompt per enabled band, in band order", () => {
    const out = buildImpactBandPrompts(defaultImpactSettings());
    expect(out.map((b) => b.band)).toEqual(["low", "mid", "high"]);
  });

  it("low-band prompt is constrained below 200Hz", () => {
    const out = buildImpactBandPrompts(defaultImpactSettings());
    const low = out.find((b) => b.band === "low")!;
    expect(low.prompt).toContain("below 200Hz");
    expect(low.prompt).toContain("no high-end content");
  });

  it("high-band prompt only mentions content above 4kHz", () => {
    const out = buildImpactBandPrompts(defaultImpactSettings());
    const high = out.find((b) => b.band === "high")!;
    expect(high.prompt).toContain("above 4kHz");
  });

  it("skips disabled bands", () => {
    const bands = defaultImpactBands().map((b) => b.band === "mid" ? { ...b, enabled: false } : b);
    const out = buildImpactBandPrompts({ ...defaultImpactSettings(), bands });
    expect(out.map((b) => b.band)).toEqual(["low", "high"]);
  });
});

describe("estimateMiscCost", () => {
  it("is 1 credit for a plain item", () => {
    expect(estimateMiscCost(1)).toBe(1);
  });

  it("adds 1 credit per band layer", () => {
    expect(estimateMiscCost(1, 3)).toBe(4);
  });
});
