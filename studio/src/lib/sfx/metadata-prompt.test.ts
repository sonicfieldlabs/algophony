import { describe, expect, it } from "vitest";
import {
  metadataToPrompt,
  promptToMetadata,
  tokenizePrompt,
} from "./metadata-prompt";

describe("metadata prompt utilities", () => {
  it("turns file, folder, sidecar, and technical metadata into a prompt candidate", () => {
    const result = metadataToPrompt({
      fileName: "metal_hatch_slam_tail.wav",
      relativePath: "doors/metal/hatches/metal_hatch_slam_tail.wav",
      tags: ["door", "metal", "tail"],
      sidecar: {
        description: "heavy spaceship hatch close with ringing decay",
        material: "steel",
      },
      audio: {
        durationSeconds: 2.45,
        sampleRate: 48000,
        channels: 2,
        codec: "WAV",
      },
      source: "imported",
    });

    expect(result.prompt).toContain("Technical metadata");
    expect(result.metadata.tags).toEqual(expect.arrayContaining(["door", "metal", "hatches"]));
    expect(result.metadata.durationSeconds).toBe(2.45);
    expect(result.metadata.layerType).toBeDefined();
  });

  it("extracts stack-oriented metadata from prompts", () => {
    const result = promptToMetadata("Servo gear motor whine, upper-mid mechanical layer, no voices.");

    expect(result.metadata.category).toBe("Machine");
    expect(result.metadata.layerType).toBe("mechanical");
    expect(result.metadata.frequencyRole).toBe("upper_mid");
    expect(result.metadata.exclusions).toContain("no voices");
    expect(result.confidence).toBeGreaterThan(0.4);
  });

  it("deduplicates prompt tokens for search", () => {
    expect(tokenizePrompt("Metal metal hatch_close with sharp transient click")).toEqual([
      "metal",
      "hatch",
      "close",
      "sharp",
      "transient",
      "click",
    ]);
  });
});
