/**
 * Algophony Studio — Vehicle Taxonomy
 *
 * Multi-vehicle sound design: engines, brakes, tires, articulations,
 * rockets and spaceships. Designed for game-audio workflows (RTPC-style
 * velocity layers + per-event stems) as well as linear cinematic use.
 */

// ── Vehicle Classes ──────────────────────────────────────────

export const VEHICLE_CLASSES = [
  "motorcycle", "scooter", "car", "sports_car", "muscle_car",
  "truck", "bus", "van", "tractor", "go_kart", "toy_vehicle",
  "boat", "jet_ski", "submarine",
  "helicopter", "propeller_plane", "jet_plane",
  "rocket", "spaceship", "alien_ship",
  "tank", "mech",
  "bicycle", "skateboard",
] as const;
export type VehicleClass = (typeof VEHICLE_CLASSES)[number];

export interface VehicleClassDef {
  id: VehicleClass;
  label: string;
  group: "ground" | "water" | "air" | "space" | "military" | "human_powered";
  icon: string;
  hue: number;
  defaultEngine: EngineFamily;
}

export const VEHICLE_CLASS_DEFS: VehicleClassDef[] = [
  { id: "motorcycle",      label: "Motorcycle",       group: "ground", icon: "Bike",       hue: 0,   defaultEngine: "ic_4stroke" },
  { id: "scooter",         label: "Scooter",          group: "ground", icon: "Bike",       hue: 20,  defaultEngine: "ic_2stroke" },
  { id: "car",             label: "Car",              group: "ground", icon: "Car",        hue: 40,  defaultEngine: "ic_4stroke" },
  { id: "sports_car",      label: "Sports Car",       group: "ground", icon: "Zap",        hue: 350, defaultEngine: "ic_4stroke" },
  { id: "muscle_car",      label: "Muscle Car",       group: "ground", icon: "Flame",      hue: 10,  defaultEngine: "ic_v8" },
  { id: "truck",           label: "Truck",            group: "ground", icon: "Truck",      hue: 60,  defaultEngine: "diesel" },
  { id: "bus",             label: "Bus",              group: "ground", icon: "Bus",        hue: 80,  defaultEngine: "diesel" },
  { id: "van",             label: "Van",              group: "ground", icon: "Container",  hue: 100, defaultEngine: "ic_4stroke" },
  { id: "tractor",         label: "Tractor",          group: "ground", icon: "Cog",        hue: 120, defaultEngine: "diesel" },
  { id: "go_kart",         label: "Go-Kart",          group: "ground", icon: "CircuitBoard", hue: 30,  defaultEngine: "ic_2stroke" },
  { id: "toy_vehicle",     label: "Toy Vehicle",      group: "ground", icon: "Gamepad2",   hue: 290, defaultEngine: "electric" },
  { id: "boat",            label: "Boat",             group: "water",  icon: "Ship",       hue: 200, defaultEngine: "ic_4stroke" },
  { id: "jet_ski",         label: "Jet Ski",          group: "water",  icon: "Waves",      hue: 195, defaultEngine: "ic_2stroke" },
  { id: "submarine",       label: "Submarine",        group: "water",  icon: "Anchor",     hue: 220, defaultEngine: "electric" },
  { id: "helicopter",      label: "Helicopter",       group: "air",    icon: "Fan",        hue: 160, defaultEngine: "turbine" },
  { id: "propeller_plane", label: "Propeller Plane",  group: "air",    icon: "PlaneTakeoff", hue: 170, defaultEngine: "ic_4stroke" },
  { id: "jet_plane",       label: "Jet Plane",        group: "air",    icon: "Plane",      hue: 180, defaultEngine: "turbine" },
  { id: "rocket",          label: "Rocket",           group: "space",  icon: "Rocket",     hue: 0,   defaultEngine: "rocket" },
  { id: "spaceship",       label: "Spaceship",        group: "space",  icon: "Orbit",      hue: 260, defaultEngine: "sci_fi_drive" },
  { id: "alien_ship",      label: "Alien Ship",       group: "space",  icon: "Hexagon",    hue: 290, defaultEngine: "sci_fi_drive" },
  { id: "tank",            label: "Tank",             group: "military", icon: "Shield",   hue: 90,  defaultEngine: "diesel" },
  { id: "mech",            label: "Mech / Walker",    group: "military", icon: "Bot",      hue: 270, defaultEngine: "sci_fi_drive" },
  { id: "bicycle",         label: "Bicycle",          group: "human_powered", icon: "Bike", hue: 140, defaultEngine: "none" },
  { id: "skateboard",      label: "Skateboard",       group: "human_powered", icon: "CircleDot", hue: 130, defaultEngine: "none" },
];

export function getVehicleClassDef(id: VehicleClass): VehicleClassDef {
  return VEHICLE_CLASS_DEFS.find((d) => d.id === id) ?? VEHICLE_CLASS_DEFS[0];
}

export const VEHICLE_GROUPS = [
  { id: "ground", label: "Ground" },
  { id: "water", label: "Water" },
  { id: "air", label: "Air" },
  { id: "space", label: "Space" },
  { id: "military", label: "Military" },
  { id: "human_powered", label: "Human-powered" },
] as const;

// ── Engine Families ──────────────────────────────────────────

export const ENGINE_FAMILIES = [
  "none", "electric", "ic_2stroke", "ic_4stroke", "ic_v8",
  "diesel", "turbine", "rocket", "sci_fi_drive", "hover_pulse",
] as const;
export type EngineFamily = (typeof ENGINE_FAMILIES)[number];

export const ENGINE_FAMILY_LABELS: Record<EngineFamily, string> = {
  none: "Human-powered (no engine)",
  electric: "Electric (whine + tone)",
  ic_2stroke: "2-stroke ICE (buzzy)",
  ic_4stroke: "4-stroke ICE (round)",
  ic_v8: "V8 (rumble + burble)",
  diesel: "Diesel (clatter + low)",
  turbine: "Turbine (whoosh + whistle)",
  rocket: "Rocket (roar + chamber)",
  sci_fi_drive: "Sci-fi drive (synth)",
  hover_pulse: "Hover pulse (cycling)",
};

// ── Articulations (per-state events) ─────────────────────────

export const ARTICULATIONS = [
  "ignition_start", "idle", "rev_up", "rev_down",
  "accelerate", "cruise", "decelerate",
  "gear_shift_up", "gear_shift_down",
  "brake_light", "brake_hard", "skid", "tire_squeal", "tire_loose_gravel",
  "burnout", "drift",
  "exhaust_pop", "backfire", "turbo_whistle", "supercharger_whine",
  "engine_off", "stall",
  "horn_short", "horn_long",
  "door_open", "door_close", "trunk_open", "trunk_close",
  "wiper_swipe", "indicator_click",
  "rotor_spinup", "rotor_steady", "rotor_spindown",
  "thrust_ignite", "thrust_cruise", "thrust_cutoff",
  "hyperdrive_charge", "hyperdrive_engage", "warp_exit",
  "footstep_metal", "servo_step",
] as const;
export type Articulation = (typeof ARTICULATIONS)[number];

export const ARTICULATION_LABELS: Record<Articulation, string> = {
  ignition_start: "Ignition start", idle: "Idle",
  rev_up: "Rev up", rev_down: "Rev down",
  accelerate: "Accelerate", cruise: "Cruise", decelerate: "Decelerate",
  gear_shift_up: "Gear shift up", gear_shift_down: "Gear shift down",
  brake_light: "Brake (light)", brake_hard: "Brake (hard)",
  skid: "Skid", tire_squeal: "Tire squeal", tire_loose_gravel: "Tire on gravel",
  burnout: "Burnout", drift: "Drift",
  exhaust_pop: "Exhaust pop", backfire: "Backfire",
  turbo_whistle: "Turbo whistle", supercharger_whine: "Supercharger whine",
  engine_off: "Engine off", stall: "Stall",
  horn_short: "Horn (short)", horn_long: "Horn (long)",
  door_open: "Door open", door_close: "Door close",
  trunk_open: "Trunk open", trunk_close: "Trunk close",
  wiper_swipe: "Wiper swipe", indicator_click: "Indicator tick",
  rotor_spinup: "Rotor spin-up", rotor_steady: "Rotor steady", rotor_spindown: "Rotor spin-down",
  thrust_ignite: "Thrust ignite", thrust_cruise: "Thrust cruise", thrust_cutoff: "Thrust cutoff",
  hyperdrive_charge: "Hyperdrive charge", hyperdrive_engage: "Hyperdrive engage", warp_exit: "Warp exit",
  footstep_metal: "Mech footstep (metal)", servo_step: "Servo step",
};

/** Articulations that make sense for a given vehicle class. */
export function articulationsFor(cls: VehicleClass): Articulation[] {
  const ground: Articulation[] = [
    "ignition_start", "idle", "rev_up", "rev_down",
    "accelerate", "cruise", "decelerate",
    "gear_shift_up", "gear_shift_down",
    "brake_light", "brake_hard", "skid", "tire_squeal", "tire_loose_gravel",
    "burnout", "drift",
    "exhaust_pop", "backfire", "turbo_whistle",
    "engine_off", "stall",
    "horn_short", "horn_long",
    "door_open", "door_close",
  ];
  const air: Articulation[] = [
    "rotor_spinup", "rotor_steady", "rotor_spindown",
    "thrust_ignite", "thrust_cruise", "thrust_cutoff",
    "accelerate", "decelerate", "cruise",
  ];
  const space: Articulation[] = [
    "thrust_ignite", "thrust_cruise", "thrust_cutoff",
    "hyperdrive_charge", "hyperdrive_engage", "warp_exit",
    "idle", "accelerate", "decelerate", "cruise",
  ];
  const water: Articulation[] = [
    "ignition_start", "idle", "accelerate", "cruise", "decelerate",
    "engine_off",
  ];
  const military: Articulation[] = [
    "ignition_start", "idle", "rev_up", "accelerate", "cruise",
    "decelerate", "brake_hard", "skid", "servo_step", "footstep_metal",
  ];
  const human: Articulation[] = ["cruise", "decelerate", "skid", "tire_squeal"];

  const def = getVehicleClassDef(cls);
  switch (def.group) {
    case "ground": return ground;
    case "air": return air;
    case "space": return space;
    case "water": return water;
    case "military": return military;
    case "human_powered": return human;
  }
}

/** Articulations that should expose the brake-system focus chip. */
export const BRAKE_ARTICULATIONS: ReadonlySet<Articulation> = new Set<Articulation>([
  "brake_light", "brake_hard", "skid",
]);

/** Articulations that should expose the tire focus chip. */
export const TIRE_ARTICULATIONS: ReadonlySet<Articulation> = new Set<Articulation>([
  "tire_squeal", "tire_loose_gravel", "burnout", "drift", "skid",
]);

export function isBrakeArticulation(a: Articulation): boolean {
  return BRAKE_ARTICULATIONS.has(a);
}

export function isTireArticulation(a: Articulation): boolean {
  return TIRE_ARTICULATIONS.has(a);
}

// ── Other axes ───────────────────────────────────────────────

export const VEHICLE_SIZES = ["toy", "compact", "midsize", "large", "heavy", "massive"] as const;
export type VehicleSize = (typeof VEHICLE_SIZES)[number];

export const VEHICLE_CONDITIONS = ["pristine", "well_tuned", "worn", "broken", "rusted", "tuned_for_performance"] as const;
export type VehicleCondition = (typeof VEHICLE_CONDITIONS)[number];

export const PERSPECTIVES = ["interior", "exterior_close", "exterior_medium", "exterior_far", "fly_by", "onboard"] as const;
export type Perspective = (typeof PERSPECTIVES)[number];

export const ENVIRONMENTS = [
  "open_road", "city_canyon", "tunnel", "garage", "track",
  "off_road", "dirt", "snow", "wet_road",
  "hangar", "open_sky", "deep_space", "atmosphere",
  "underwater", "open_water", "harbor",
] as const;
export type Environment = (typeof ENVIRONMENTS)[number];

export const VEHICLE_REALISMS = ["documentary", "realistic", "cinematic", "hyperreal", "stylized", "cartoon"] as const;
export type VehicleRealism = (typeof VEHICLE_REALISMS)[number];

// ── Velocity Layers (game audio) ─────────────────────────────

export const VELOCITY_LAYERS = ["idle", "low", "mid", "high", "max", "redline"] as const;
export type VelocityLayer = (typeof VELOCITY_LAYERS)[number];

export const VELOCITY_LAYER_LABELS: Record<VelocityLayer, string> = {
  idle: "Idle (0 RPM)",
  low: "Low (~1500 RPM)",
  mid: "Mid (~3500 RPM)",
  high: "High (~5500 RPM)",
  max: "Max (~7000 RPM)",
  redline: "Redline (~8500 RPM)",
};

// ── Brake / Tire System Points ───────────────────────────────

export const BRAKE_POINTS = [
  "pad_squeal", "disc_grind", "drum_groan", "regen_whine",
  "abs_pulsing", "handbrake_lever", "release_hiss",
] as const;
export type BrakePoint = (typeof BRAKE_POINTS)[number];

export const TIRE_FOCUSES = [
  "rolling_smooth", "rolling_rough", "squeal_friction",
  "gravel_spray", "wet_splash", "snow_crunch", "deflated_thump",
  "burnout_smoke", "drift_chirp",
] as const;
export type TireFocus = (typeof TIRE_FOCUSES)[number];

// ── Master Vehicle Config ────────────────────────────────────

export interface VehicleConfig {
  vehicleClass: VehicleClass;
  engineFamily: EngineFamily;
  size: VehicleSize;
  condition: VehicleCondition;
  perspective: Perspective;
  environment: Environment;
  realism: VehicleRealism;
  /** Active articulation for single-shot generation. */
  articulation: Articulation;
  /** Optional explicit brake-system focus when articulation is a brake event. */
  brakePoint?: BrakePoint;
  /** Optional tire focus when articulation is a tire event. */
  tireFocus?: TireFocus;
  /** Free-form descriptors that feed the prompt builder. */
  descriptors: string[];
}

export function defaultVehicleConfig(): VehicleConfig {
  return {
    vehicleClass: "muscle_car",
    engineFamily: "ic_v8",
    size: "midsize",
    condition: "well_tuned",
    perspective: "exterior_close",
    environment: "open_road",
    realism: "cinematic",
    articulation: "rev_up",
    descriptors: [],
  };
}

// ── Velocity-Layer Set Plan ──────────────────────────────────

export interface VelocityLayerPlan {
  index: number;
  layer: VelocityLayer;
  prompt: string;
  filename: string;
}

// ── Client Entities ──────────────────────────────────────────

export type VehicleStatus = "draft" | "queued" | "generating" | "generated" | "failed";

export interface VehicleItem {
  id: string;
  config: VehicleConfig;
  articulation: Articulation;
  velocityLayer?: VelocityLayer;
  composedPrompt: string;
  audioUrl?: string;
  generationId?: string;
  takeNumber: number;
  status: VehicleStatus;
  errorMessage?: string;
  /** Per-vehicle filename slug for game-ready stems. */
  filename?: string;
}
