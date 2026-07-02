/**
 * Algophony Studio — "Send to Tool" Routing System
 *
 * Every generated asset gets a contextual action menu
 * to route it to any tool in the workspace.
 *
 * Placement: Sounds page (row-level actions)
 */

// ── Route Destinations ───────────────────────────────────────

export type RouteDestination =
  | "variation_lab"
  | "atmosphere_maker"
  | "ui_elements"
  | "foley_lab"
  | "creature_lab"
  | "export_center"
  | "review"
  | "project"
  | "daw_pack"
  | "game_manifest"
  | "generate"
  | "recipes"
  | "image_to_sound";

export interface RouteDef {
  id: RouteDestination;
  label: string;
  icon: string;
  path: string;
  description: string;
  minTier: "free" | "creator" | "studio" | "team";
  /** What data keys to include in the route payload */
  payloadKeys: string[];
}

export const ROUTE_DESTINATIONS: RouteDef[] = [
  {
    id: "variation_lab",
    label: "Variation Lab",
    icon: "flask-conical",
    path: "/dashboard/variation-lab",
    description: "Generate variations from this sound's prompt",
    minTier: "free",
    payloadKeys: ["prompt", "exclusions", "duration", "loop", "promptInfluence", "generationId"],
  },
  {
    id: "atmosphere_maker",
    label: "Atmosphere Maker",
    icon: "cloud-fog",
    path: "/dashboard/atmosphere-builder",
    description: "Use as a layer in an atmosphere composition",
    minTier: "creator",
    payloadKeys: ["prompt", "generationId", "category", "layerRole"],
  },
  {
    id: "ui_elements",
    label: "UI Elements",
    icon: "sliders-horizontal",
    path: "/dashboard/ui-elements",
    description: "Add to UI sound design workspace",
    minTier: "free",
    payloadKeys: ["prompt", "generationId", "duration"],
  },
  {
    id: "image_to_sound",
    label: "Image to Sound",
    icon: "aperture",
    path: "/dashboard/image-to-sound",
    description: "Interpret a visual reference as sound design",
    minTier: "creator",
    payloadKeys: ["prompt", "category", "layerRole", "generationId"],
  },
  {
    id: "creature_lab",
    label: "Creature Lab",
    icon: "bug",
    path: "/dashboard/creature-lab",
    description: "Use as a layer in creature design",
    minTier: "creator",
    payloadKeys: ["prompt", "generationId", "category", "layerRole"],
  },
  {
    id: "export_center",
    label: "Export Center",
    icon: "package",
    path: "/dashboard/export",
    description: "Add to export queue for DAW/game packaging",
    minTier: "free",
    payloadKeys: ["generationId", "prompt", "category", "filename"],
  },
  {
    id: "generate",
    label: "Re-Generate",
    icon: "refresh-cw",
    path: "/dashboard/generate",
    description: "Open this prompt in the generator for tweaking",
    minTier: "free",
    payloadKeys: ["prompt", "exclusions", "duration", "loop", "promptInfluence", "model"],
  },
  {
    id: "recipes",
    label: "Sound Recipes",
    icon: "book-open",
    path: "/dashboard/recipes",
    description: "Find recipes that match this sound type",
    minTier: "free",
    payloadKeys: ["prompt", "category"],
  },
  {
    id: "review",
    label: "Send to Review",
    icon: "eye",
    path: "/dashboard/sounds",
    description: "Mark for client/team review",
    minTier: "free",
    payloadKeys: ["generationId"],
  },
  {
    id: "project",
    label: "Assign to Project",
    icon: "folder-kanban",
    path: "/dashboard/projects",
    description: "Assign this sound to a project",
    minTier: "free",
    payloadKeys: ["generationId", "prompt", "category"],
  },
  {
    id: "daw_pack",
    label: "DAW Pack",
    icon: "sliders-vertical",
    path: "/dashboard/export?tab=daw_handoff",
    description: "Add to DAW handoff package",
    minTier: "studio",
    payloadKeys: ["generationId", "prompt", "filename", "duration", "category"],
  },
  {
    id: "game_manifest",
    label: "Game Manifest",
    icon: "gamepad-2",
    path: "/dashboard/export?tab=game_audio",
    description: "Add to game audio manifest",
    minTier: "studio",
    payloadKeys: ["generationId", "prompt", "category", "filename", "layerRole", "variation"],
  },
];

// ── Route Payload Builder ────────────────────────────────────

export interface RoutePayload {
  prompt: string;
  exclusions: string[];
  duration: number;
  loop: boolean;
  promptInfluence: number;
  model: string;
  generationId: string;
  category: string;
  filename: string;
  layerRole: string;
  variation: string;
  sourceRoute: string;
}

/**
 * Build a route payload from a generation record.
 */
export function buildRoutePayload(
  generation: Record<string, unknown>,
  destination: RouteDestination
): Partial<RoutePayload> {
  const payload = (generation.request_payload ?? {}) as Record<string, unknown>;
  const meta = (generation.metadata ?? {}) as Record<string, unknown>;
  const path = String(generation.audio_storage_path ?? "");
  const filename = path.split("/").pop() ?? `sfx_${String(generation.id ?? "").slice(0, 8)}.mp3`;

  const full: RoutePayload = {
    prompt: String(payload.text ?? ""),
    exclusions: (meta.exclusions as string[]) ?? [],
    duration: Number(generation.duration_seconds ?? payload.duration_seconds ?? 4),
    loop: Boolean(payload.loop),
    promptInfluence: Number(payload.prompt_influence ?? 0.3),
    model: String(generation.elevenlabs_model_id ?? payload.model_id ?? ""),
    generationId: String(generation.id ?? ""),
    category: String(payload.category ?? meta.category ?? ""),
    filename,
    layerRole: String(meta.layerRole ?? meta.layer_role ?? ""),
    variation: String(meta.variation ?? meta.version ?? ""),
    sourceRoute: "sounds",
  };

  // Filter to only include keys the destination needs
  const route = ROUTE_DESTINATIONS.find((r) => r.id === destination);
  if (!route) return full;

  const filtered: Partial<RoutePayload> = {};
  for (const key of route.payloadKeys) {
    (filtered as Record<string, unknown>)[key] = (full as unknown as Record<string, unknown>)[key];
  }
  filtered.sourceRoute = "sounds";
  return filtered;
}

/**
 * Store route payload for the destination page to pick up.
 */
export function routeToTool(
  generation: Record<string, unknown>,
  destination: RouteDestination
): string {
  const payload = buildRoutePayload(generation, destination);
  const route = ROUTE_DESTINATIONS.find((r) => r.id === destination);

  if (typeof window !== "undefined") {
    localStorage.setItem("algophony-studio-route-payload", JSON.stringify({
      destination,
      payload,
      timestamp: Date.now(),
    }));
  }

  return route?.path ?? "/dashboard";
}

/**
 * Pick up a route payload on the destination page.
 */
export function consumeRoutePayload(): {
  destination: RouteDestination;
  payload: Partial<RoutePayload>;
} | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("algophony-studio-route-payload");
    if (!raw) return null;
    const data = JSON.parse(raw);
    // Only consume if recent (< 30 seconds)
    if (Date.now() - data.timestamp > 30_000) {
      localStorage.removeItem("algophony-studio-route-payload");
      return null;
    }
    localStorage.removeItem("algophony-studio-route-payload");
    return data;
  } catch {
    return null;
  }
}
