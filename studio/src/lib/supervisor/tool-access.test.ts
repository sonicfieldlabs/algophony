import { describe, expect, it } from "vitest";
import { getRequiredEntitlementForTool } from "./tool-access";

describe("supervisor tool access", () => {
  it("maps basic planning tools to local supervisor access", () => {
    expect(getRequiredEntitlementForTool("create_sound_cue_list")).toBe("supervisor_tools");
    expect(getRequiredEntitlementForTool("create_layer_plan")).toBe("supervisor_tools");
    expect(getRequiredEntitlementForTool("generate_sfx_from_prompt_card")).toBe("supervisor_tools");
  });

  it("maps batch, reference, and export planning tools to local entitlements", () => {
    expect(getRequiredEntitlementForTool("create_prompt_cards_batch")).toBe("batch_prompt_generation");
    expect(getRequiredEntitlementForTool("generate_variation_batch")).toBe("batch_prompt_generation");
    expect(getRequiredEntitlementForTool("analyze_reference_audio")).toBe("sonic_dna_profiles");
    expect(getRequiredEntitlementForTool("prepare_export_plan")).toBe("export_metadata");
  });

  it("maps handoff artifacts to advanced local supervisor access", () => {
    expect(getRequiredEntitlementForTool("create_daw_handoff_pack")).toBe("supervisor_advanced");
    expect(getRequiredEntitlementForTool("create_game_audio_manifest")).toBe("supervisor_advanced");
  });
});
