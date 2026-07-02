import { describe, it, expect } from "vitest";
import {
  buildVehiclePrompt, buildArticulationPrompt, buildVelocityLayerPlan,
  buildTirePass, buildBrakePass, estimateVehicleCost,
} from "./vehicle-prompt";
import {
  defaultVehicleConfig, isBrakeArticulation, isTireArticulation,
  VELOCITY_LAYERS, BRAKE_POINTS, TIRE_FOCUSES,
} from "./vehicle-taxonomy";

describe("buildVehiclePrompt", () => {
  it("includes class, engine and articulation", () => {
    const p = buildVehiclePrompt(defaultVehicleConfig());
    expect(p.toLowerCase()).toContain("muscle car");
    expect(p).toContain("V8");
    expect(p).toContain("rev up");
  });

  it("excludes music and dialogue", () => {
    const p = buildVehiclePrompt(defaultVehicleConfig());
    expect(p).toContain("no music, no dialogue");
  });

  it("includes the environment", () => {
    const p = buildVehiclePrompt({ ...defaultVehicleConfig(), environment: "tunnel" });
    expect(p).toContain("environment: tunnel");
  });

  it("propagates brake focus when set", () => {
    const p = buildArticulationPrompt(
      { ...defaultVehicleConfig(), brakePoint: "abs_pulsing" },
      "brake_hard"
    );
    expect(p).toContain("abs pulsing");
  });

  it("propagates tire focus when set", () => {
    const p = buildArticulationPrompt(
      { ...defaultVehicleConfig(), tireFocus: "drift_chirp" },
      "drift"
    );
    expect(p).toContain("drift chirp");
  });

  it("inlines descriptors", () => {
    const p = buildVehiclePrompt({ ...defaultVehicleConfig(), descriptors: ["straight pipes", "dry sump"] });
    expect(p).toContain("straight pipes");
    expect(p).toContain("dry sump");
  });
});

describe("buildVelocityLayerPlan", () => {
  const plan = buildVelocityLayerPlan(defaultVehicleConfig());

  it("returns one plan per velocity layer", () => {
    expect(plan).toHaveLength(VELOCITY_LAYERS.length);
  });

  it("emits loopable-steady prompts (no transients)", () => {
    for (const p of plan) {
      expect(p.prompt).toContain("loopable steady sustained tone");
      expect(p.prompt).toContain("no transients");
    }
  });

  it("filename slugs are vehicleClass_engineFamily_layer", () => {
    const idle = plan.find((p) => p.layer === "idle")!;
    expect(idle.filename).toBe("muscle_car_ic_v8_idle");
  });
});

describe("articulation classification helpers", () => {
  it("brake helper accepts brake_light and skid", () => {
    expect(isBrakeArticulation("brake_light")).toBe(true);
    expect(isBrakeArticulation("skid")).toBe(true);
  });

  it("brake helper rejects non-brake articulations", () => {
    expect(isBrakeArticulation("idle")).toBe(false);
  });

  it("tire helper accepts tire_squeal, burnout, drift and skid", () => {
    expect(isTireArticulation("tire_squeal")).toBe(true);
    expect(isTireArticulation("burnout")).toBe(true);
    expect(isTireArticulation("drift")).toBe(true);
    expect(isTireArticulation("skid")).toBe(true);
  });

  it("tire helper rejects idle", () => {
    expect(isTireArticulation("idle")).toBe(false);
  });
});

describe("buildTirePass", () => {
  const pass = buildTirePass(defaultVehicleConfig());

  it("covers every TireFocus exactly once", () => {
    const focuses = pass.map((p) => p.focus);
    expect(new Set(focuses).size).toBe(focuses.length);
    for (const tf of TIRE_FOCUSES) {
      expect(focuses).toContain(tf);
    }
  });

  it("each item embeds its tire focus in the prompt", () => {
    for (const p of pass) {
      expect(p.prompt).toContain(`tire focus: ${p.focus.replace(/_/g, " ")}`);
    }
  });

  it("filenames are slug-prefixed and unique", () => {
    const names = pass.map((p) => p.filename);
    expect(new Set(names).size).toBe(names.length);
    for (const n of names) expect(n.startsWith("muscle_car_tires_")).toBe(true);
  });
});

describe("buildBrakePass", () => {
  const pass = buildBrakePass(defaultVehicleConfig());

  it("covers every BrakePoint exactly once", () => {
    const points = pass.map((p) => p.point);
    expect(new Set(points).size).toBe(points.length);
    for (const bp of BRAKE_POINTS) {
      expect(points).toContain(bp);
    }
  });

  it("each item embeds its brake point in the prompt", () => {
    for (const p of pass) {
      expect(p.prompt).toContain(`brake focus: ${p.point.replace(/_/g, " ")}`);
    }
  });

  it("filenames are slug-prefixed and unique", () => {
    const names = pass.map((p) => p.filename);
    expect(new Set(names).size).toBe(names.length);
    for (const n of names) expect(n.startsWith("muscle_car_brakes_")).toBe(true);
  });
});

describe("estimateVehicleCost", () => {
  it("is N credits for N items", () => {
    expect(estimateVehicleCost(1)).toBe(1);
    expect(estimateVehicleCost(7)).toBe(7);
  });
});
