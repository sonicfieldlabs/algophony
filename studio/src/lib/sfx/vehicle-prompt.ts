/**
 * Algophony Studio — Vehicle Prompt Engine
 *
 * Builds ElevenLabs-ready prompts for vehicle articulations and
 * velocity-layer sets (game-audio style RPM stems).
 */

import type {
  VehicleConfig,
  Articulation,
  VelocityLayer,
  VelocityLayerPlan,
  BrakePoint,
  TireFocus,
} from "./vehicle-taxonomy";
import {
  VELOCITY_LAYERS,
  ARTICULATION_LABELS,
  ENGINE_FAMILY_LABELS,
  BRAKE_POINTS,
  getVehicleClassDef,
} from "./vehicle-taxonomy";

const EXCLUDE = "no music, no dialogue, isolated vehicle sound effect";

export function buildVehiclePrompt(cfg: VehicleConfig): string {
  return buildArticulationPrompt(cfg, cfg.articulation);
}

export function buildArticulationPrompt(cfg: VehicleConfig, articulation: Articulation): string {
  const cls = getVehicleClassDef(cfg.vehicleClass);
  const eng = ENGINE_FAMILY_LABELS[cfg.engineFamily];
  const articulationLabel = ARTICULATION_LABELS[articulation].toLowerCase();

  // Per-articulation hint
  const hint = articulationHint(articulation);

  // Optional brake/tire focus
  const brake = cfg.brakePoint
    ? `brake focus: ${cfg.brakePoint.replace(/_/g, " ")}`
    : "";
  const tire = cfg.tireFocus
    ? `tire focus: ${cfg.tireFocus.replace(/_/g, " ")}`
    : "";

  const perspective = cfg.perspective.replace(/_/g, " ");
  const env = cfg.environment.replace(/_/g, " ");
  const descriptors = cfg.descriptors.length ? cfg.descriptors.join(", ") : "";

  const parts = [
    `${perspective} ${cfg.realism} recording of a ${cfg.size} ${cls.label.toLowerCase()}`,
    `engine type: ${eng}`,
    `${articulationLabel} articulation`,
    hint,
    `condition: ${cfg.condition.replace(/_/g, " ")}`,
    brake,
    tire,
    `environment: ${env}`,
    descriptors,
    EXCLUDE,
  ].filter(Boolean);

  return clean(parts.join(", ") + ".");
}

function articulationHint(a: Articulation): string {
  switch (a) {
    case "idle": return "steady idle loop, no movement";
    case "ignition_start": return "key turn, starter motor, engine catch and settle";
    case "rev_up": return "throttle blip rising, full sweep to high RPM, no cruise";
    case "rev_down": return "throttle release, RPM falling back to idle";
    case "accelerate": return "from low RPM through the gears, sustained acceleration";
    case "cruise": return "steady high-speed cruise, stable RPM, loopable";
    case "decelerate": return "engine braking, RPM dropping, gradual slowdown";
    case "gear_shift_up": return "brief clutch dip, RPM dip and re-catch";
    case "gear_shift_down": return "downshift, throttle blip and RPM jump";
    case "brake_light": return "light pad contact, gentle friction, no skid";
    case "brake_hard": return "hard brake application, heavy pad bite, possible skid edge";
    case "skid": return "tires losing grip, rubber on tarmac, mid-skid";
    case "tire_squeal": return "rubber on hot tarmac, high-frequency squeal";
    case "tire_loose_gravel": return "loose gravel under tires, stone spray";
    case "burnout": return "stationary burnout, tires spinning, smoke building";
    case "drift": return "controlled sliding, tires chirping, weight transfer";
    case "exhaust_pop": return "single exhaust pop, sharp pressure release";
    case "backfire": return "backfire crack, flame burst implied, exhaust ringing";
    case "turbo_whistle": return "turbocharger whistle, spool-up";
    case "supercharger_whine": return "supercharger whine, belt-driven cycling";
    case "engine_off": return "throttle cut, engine spin down to silence";
    case "stall": return "engine choking out, sputter to stop";
    case "horn_short": return "short horn blast";
    case "horn_long": return "long sustained horn";
    case "door_open": return "door latch release, hinge swing, soft chassis flex";
    case "door_close": return "door slam, latch click, body resonance";
    case "trunk_open": return "trunk latch, lid lift";
    case "trunk_close": return "trunk lid close, latch lock";
    case "wiper_swipe": return "single wiper swipe, rubber on glass";
    case "indicator_click": return "indicator relay tick, dashboard";
    case "rotor_spinup": return "rotor accelerating from rest to operating speed";
    case "rotor_steady": return "rotors at steady RPM, loopable";
    case "rotor_spindown": return "rotors winding down to stop";
    case "thrust_ignite": return "ignition kick, chamber pressure build";
    case "thrust_cruise": return "sustained thrust, deep roar";
    case "thrust_cutoff": return "thrust cut, decay to ambient";
    case "hyperdrive_charge": return "charging energy build, harmonic rising";
    case "hyperdrive_engage": return "energetic snap, doppler shift, sub bass impact";
    case "warp_exit": return "deceleration whoosh, harmonic settle";
    case "footstep_metal": return "heavy metal foot impact on hard ground, mech-scale";
    case "servo_step": return "robotic servo articulation, mechanical step";
  }
}

// ── Velocity Layer Set Plan ──────────────────────────────────

export function buildVelocityLayerPlan(cfg: VehicleConfig): VelocityLayerPlan[] {
  const cls = getVehicleClassDef(cfg.vehicleClass);
  const eng = ENGINE_FAMILY_LABELS[cfg.engineFamily];
  const env = cfg.environment.replace(/_/g, " ");
  const slug = `${cfg.vehicleClass}_${cfg.engineFamily}`;

  return VELOCITY_LAYERS.map((layer, i) => ({
    index: i,
    layer,
    filename: `${slug}_${layer}`,
    prompt: clean([
      `${cfg.perspective.replace(/_/g, " ")} recording of a ${cls.label.toLowerCase()} engine at ${velocityHint(layer)}`,
      `engine type: ${eng}`,
      "loopable steady sustained tone, no transients, no shifts, isolated engine",
      `environment: ${env}`,
      `${cfg.realism} style`,
      EXCLUDE,
    ].filter(Boolean).join(", ") + "."),
  }));
}

function velocityHint(l: VelocityLayer): string {
  switch (l) {
    case "idle": return "idle RPM, gentle pulsing";
    case "low": return "low RPM (~1500), warm and steady";
    case "mid": return "mid RPM (~3500), focused and assertive";
    case "high": return "high RPM (~5500), aggressive and bright";
    case "max": return "max RPM (~7000), screaming";
    case "redline": return "redline RPM (~8500), at the edge of mechanical limit";
  }
}

// ── Bundle: Tire Close-up Pass ────────────────────────────────

export interface TirePassItem {
  index: number;
  focus: TireFocus;
  articulation: Articulation;
  prompt: string;
  filename: string;
}

/** Builds a coordinated set of tire-focused stems for game / cinematic close-ups. */
export function buildTirePass(cfg: VehicleConfig): TirePassItem[] {
  const slug = `${cfg.vehicleClass}_tires`;

  /** Map each focus to a matching articulation for the underlying prompt builder. */
  const matrix: { focus: TireFocus; articulation: Articulation }[] = [
    { focus: "rolling_smooth",  articulation: "cruise" },
    { focus: "rolling_rough",   articulation: "tire_loose_gravel" },
    { focus: "squeal_friction", articulation: "tire_squeal" },
    { focus: "wet_splash",      articulation: "skid" },
    { focus: "snow_crunch",     articulation: "decelerate" },
    { focus: "burnout_smoke",   articulation: "burnout" },
    { focus: "drift_chirp",     articulation: "drift" },
    { focus: "deflated_thump",  articulation: "decelerate" },
    { focus: "gravel_spray",    articulation: "accelerate" },
  ];

  return matrix.map((m, i) => ({
    index: i,
    focus: m.focus,
    articulation: m.articulation,
    prompt: buildArticulationPrompt({ ...cfg, tireFocus: m.focus }, m.articulation),
    filename: `${slug}_${m.focus}`,
  }));
}

// ── Bundle: Full Brake-System Pass ────────────────────────────

export interface BrakePassItem {
  index: number;
  point: BrakePoint;
  articulation: Articulation;
  prompt: string;
  filename: string;
}

/** Builds a coordinated set of brake-system stems (pad, disc, drum, regen, abs, handbrake, release). */
export function buildBrakePass(cfg: VehicleConfig): BrakePassItem[] {
  const slug = `${cfg.vehicleClass}_brakes`;

  /** Brake events: which articulation pairs with each brake-system point. */
  const matrix: { point: BrakePoint; articulation: Articulation }[] = [
    { point: "pad_squeal",     articulation: "brake_light" },
    { point: "disc_grind",     articulation: "brake_hard" },
    { point: "drum_groan",     articulation: "brake_hard" },
    { point: "regen_whine",    articulation: "decelerate" },
    { point: "abs_pulsing",    articulation: "brake_hard" },
    { point: "handbrake_lever",articulation: "skid" },
    { point: "release_hiss",   articulation: "engine_off" },
  ];

  // Cover any brake points we didn't explicitly map (defensive — keeps array in sync).
  const covered = new Set(matrix.map((m) => m.point));
  for (const bp of BRAKE_POINTS) {
    if (!covered.has(bp)) matrix.push({ point: bp, articulation: "brake_light" });
  }

  return matrix.map((m, i) => ({
    index: i,
    point: m.point,
    articulation: m.articulation,
    prompt: buildArticulationPrompt({ ...cfg, brakePoint: m.point }, m.articulation),
    filename: `${slug}_${m.point}`,
  }));
}

// ── Cost ──────────────────────────────────────────────────────

export function estimateVehicleCost(itemCount: number): number {
  return itemCount;
}

// ── Helpers ───────────────────────────────────────────────────

function clean(s: string): string {
  return s.replace(/\s+/g, " ").replace(/,\s*,/g, ", ").trim();
}
