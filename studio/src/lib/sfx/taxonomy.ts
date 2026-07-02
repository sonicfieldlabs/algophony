/**
 * Algophony Studio — Taxonomy
 *
 * Canonical category definitions with subcategories, surfaces, and default exclusions.
 * This is the structured vocabulary for the prompt-native SFX workflow.
 */

export interface CategoryDefinition {
  category: string;
  subcategories: string[];
  surfaces?: string[];
  environments?: string[];
  defaultExclusions: string[];
}

export const SFX_CATEGORIES: CategoryDefinition[] = [
  {
    category: "Air",
    subcategories: ["whoosh", "breeze", "gust", "wind tunnel", "air release", "pneumatic", "compressed air"],
    environments: ["outdoor open field", "wind tunnel", "mountain pass", "rooftop"],
    defaultExclusions: ["no music", "no dialogue"],
  },
  {
    category: "Aircraft",
    subcategories: ["jet flyby", "helicopter", "propeller plane", "drone", "takeoff", "landing", "cockpit"],
    environments: ["airport tarmac", "open sky", "hangar", "cockpit interior"],
    defaultExclusions: ["no music", "no dialogue", "no crowd noise"],
  },
  {
    category: "Alarm",
    subcategories: ["fire alarm", "security alarm", "car alarm", "clock alarm", "siren", "buzzer", "alert tone"],
    environments: ["office building", "residential", "hospital corridor", "factory floor"],
    defaultExclusions: ["no music", "no dialogue"],
  },
  {
    category: "Ambience",
    subcategories: ["city", "forest", "rain", "ocean", "cafe", "office", "subway", "market", "night"],
    environments: ["urban street", "dense forest", "coastal cliff", "indoor cafe", "underground tunnel"],
    defaultExclusions: ["no music", "no dialogue"],
  },
  {
    category: "Animal",
    subcategories: ["dog", "cat", "bird", "insect", "rodent", "horse", "wild animal", "reptile"],
    environments: ["forest", "barnyard", "urban alley", "jungle", "savanna"],
    defaultExclusions: ["no music", "no dialogue", "no cartoon tone"],
  },
  {
    category: "Bell",
    subcategories: ["church bell", "door bell", "bicycle bell", "wind chime", "school bell", "shop bell", "sleigh bell"],
    environments: ["church interior", "residential doorway", "outdoor plaza", "workshop"],
    defaultExclusions: ["no music", "no dialogue"],
  },
  {
    category: "Boat",
    subcategories: ["motorboat", "sailboat", "rowboat", "ship horn", "anchor chain", "hull creaking", "wake splash"],
    environments: ["open sea", "harbor", "river", "lake", "canal"],
    defaultExclusions: ["no music", "no dialogue"],
  },
  {
    category: "Booms",
    subcategories: ["explosion", "cannon", "thunder clap", "sonic boom", "deep impact", "sub drop", "rumble hit"],
    environments: ["battlefield", "open desert", "stadium", "underground cavern"],
    defaultExclusions: ["no music", "no dialogue", "no cartoon tone"],
  },
  {
    category: "Creature",
    subcategories: ["growl", "screech", "hiss", "roar", "chitter", "slither", "crawl", "wing flutter"],
    environments: ["cave", "swamp", "alien landscape", "dungeon", "flooded tunnel"],
    defaultExclusions: ["no music", "no dialogue", "no cartoon tone"],
  },
  {
    category: "Door",
    subcategories: ["wooden door", "metal door", "sliding door", "creaking", "slam", "lock turn", "knock"],
    surfaces: ["wood", "metal", "glass"],
    environments: ["hallway", "dungeon", "apartment", "office"],
    defaultExclusions: ["no music", "no dialogue"],
  },
  {
    category: "Electricity",
    subcategories: ["spark", "arc", "buzzing wire", "transformer hum", "short circuit", "static discharge", "power surge"],
    environments: ["power plant", "server room", "underground tunnel", "laboratory"],
    defaultExclusions: ["no music", "no dialogue"],
  },
  {
    category: "Environment",
    subcategories: ["wind", "rain", "thunder", "earthquake", "avalanche", "volcano", "flood"],
    environments: ["mountain peak", "coastal", "desert", "tundra", "tropical forest"],
    defaultExclusions: ["no music", "no dialogue"],
  },
  {
    category: "Fire",
    subcategories: ["campfire", "fireplace", "wildfire", "torch", "match strike", "flamethrower", "ember crackle"],
    environments: ["campsite", "burning building", "fireplace room", "forest fire"],
    defaultExclusions: ["no music", "no dialogue"],
  },
  {
    category: "Foley",
    subcategories: ["cloth rustle", "paper", "glass clink", "ceramic", "plastic bag", "zipper", "button click", "body movement"],
    surfaces: ["fabric", "paper", "glass", "ceramic", "plastic", "leather"],
    environments: ["recording studio", "kitchen", "bedroom", "office"],
    defaultExclusions: ["no music", "no dialogue", "no excessive reverb"],
  },
  {
    category: "Footsteps",
    subcategories: ["boots", "sneakers", "barefoot", "running", "stumbling", "heels", "marching", "limping"],
    surfaces: ["wet concrete", "gravel", "wood floor", "metal stairs", "mud", "sand", "snow", "tile"],
    environments: ["hallway", "alley", "forest trail", "stairwell", "subway platform"],
    defaultExclusions: ["no music", "no dialogue", "no cartoon tone"],
  },
  {
    category: "Game",
    subcategories: ["coin collect", "power up", "level up", "game over", "menu select", "achievement", "health pickup"],
    defaultExclusions: ["no dialogue"],
  },
  {
    category: "Horror",
    subcategories: ["drone", "stinger", "tension riser", "whisper", "bone crack", "wet squelch", "distant scream", "breath"],
    environments: ["abandoned building", "graveyard", "basement", "attic", "forest at night"],
    defaultExclusions: ["no music", "no cartoon tone"],
  },
  {
    category: "Impact",
    subcategories: ["punch", "kick", "body fall", "metal hit", "wood hit", "crash", "stomp", "slam"],
    surfaces: ["metal", "wood", "concrete", "flesh", "glass"],
    environments: ["boxing ring", "warehouse", "street", "dojo"],
    defaultExclusions: ["no music", "no dialogue", "no cartoon tone"],
  },
  {
    category: "Machinery",
    subcategories: ["engine idle", "hydraulic press", "conveyor belt", "drill", "saw", "crane", "compressor", "gears"],
    environments: ["factory floor", "construction site", "garage", "workshop"],
    defaultExclusions: ["no music", "no dialogue"],
  },
  {
    category: "Magic",
    subcategories: ["spell cast", "shimmer", "portal", "enchantment", "transformation", "energy burst", "crystal tone"],
    environments: ["enchanted forest", "wizard tower", "dungeon", "ethereal void"],
    defaultExclusions: ["no dialogue"],
  },
  {
    category: "Object",
    subcategories: ["switch toggle", "drawer open", "bottle cap", "coin drop", "chain rattle", "key jingle", "pencil write"],
    surfaces: ["metal", "wood", "glass", "plastic", "stone"],
    environments: ["office", "kitchen", "workshop", "bedroom"],
    defaultExclusions: ["no music", "no dialogue"],
  },
  {
    category: "Office",
    subcategories: ["keyboard typing", "mouse click", "printer", "paper shred", "stapler", "phone ring", "chair squeak"],
    environments: ["open plan office", "cubicle", "home office", "meeting room"],
    defaultExclusions: ["no music", "no dialogue", "no crowd noise"],
  },
  {
    category: "Robot",
    subcategories: ["servo motor", "hydraulic arm", "digital voice", "boot sequence", "power down", "processing", "error beep"],
    environments: ["laboratory", "factory", "spaceship", "control room"],
    defaultExclusions: ["no music", "no dialogue"],
  },
  {
    category: "Sci-fi",
    subcategories: ["laser", "force field", "teleport", "engine thrust", "alien comm", "shield activate", "plasma burst"],
    environments: ["spaceship interior", "space station", "alien planet", "warp tunnel"],
    defaultExclusions: ["no dialogue"],
  },
  {
    category: "UI",
    subcategories: ["click", "hover", "notification", "error", "success", "swipe", "toggle", "loading"],
    defaultExclusions: ["no music", "no dialogue", "no excessive reverb"],
  },
  {
    category: "Vehicle",
    subcategories: ["car engine", "motorcycle", "truck", "train", "bus", "bicycle", "skateboard", "tram"],
    environments: ["highway", "city street", "tunnel", "parking garage", "train station"],
    defaultExclusions: ["no music", "no dialogue"],
  },
  {
    category: "Water",
    subcategories: ["splash", "drip", "pour", "stream", "waterfall", "bubbles", "underwater", "wave crash"],
    environments: ["bathroom", "cave pool", "riverbank", "ocean shore", "swimming pool"],
    defaultExclusions: ["no music", "no dialogue"],
  },
  {
    category: "Weapon",
    subcategories: ["gunshot", "reload", "sword draw", "arrow release", "shield block", "knife slash", "whip crack"],
    environments: ["firing range", "battlefield", "arena", "forest ambush"],
    defaultExclusions: ["no music", "no dialogue", "no cartoon tone"],
  },
  {
    category: "Weather",
    subcategories: ["rain", "thunder", "hail", "wind", "blizzard", "lightning strike", "drizzle"],
    environments: ["open field", "rooftop", "window interior", "mountain", "coastal"],
    defaultExclusions: ["no music", "no dialogue"],
  },
  {
    category: "Whoosh",
    subcategories: ["fast pass", "slow sweep", "swing", "arrow flyby", "fabric swish", "blade cut", "air rush"],
    defaultExclusions: ["no music", "no dialogue", "no cartoon tone"],
  },
];

/** Default exclusion tags available across all categories */
export const DEFAULT_EXCLUSIONS = [
  "no music",
  "no dialogue",
  "no crowd noise",
  "no cartoon tone",
  "no excessive reverb",
  "no melody",
  "no synthetic artifacts",
  "no theatrical stinger",
];

/** Lookup a category definition by name (case-insensitive) */
export function getCategoryDefinition(
  categoryName: string
): CategoryDefinition | undefined {
  return SFX_CATEGORIES.find(
    (c) => c.category.toLowerCase() === categoryName.toLowerCase()
  );
}

/** Get all category names */
export function getCategoryNames(): string[] {
  return SFX_CATEGORIES.map((c) => c.category);
}

/** Get subcategories for a given category */
export function getSubcategories(categoryName: string): string[] {
  return getCategoryDefinition(categoryName)?.subcategories ?? [];
}

/** Get surfaces for a given category */
export function getSurfaces(categoryName: string): string[] {
  return getCategoryDefinition(categoryName)?.surfaces ?? [];
}

/** Get environments for a given category */
export function getEnvironments(categoryName: string): string[] {
  return getCategoryDefinition(categoryName)?.environments ?? [];
}
