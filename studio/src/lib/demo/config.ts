export const DEMO_LIMIT_REACHED_MESSAGE =
  "Local generation limit reached.";

export const GENERATION_DISABLED_MESSAGE =
  "Generation is disabled.";

export type DemoGenerationKind = "sfx" | "music" | "voice" | "hybrid";

export type DemoUserLike = {
  id?: string | null;
  email?: string | null;
  role?: string | null;
  is_demo_user?: boolean | null;
  app_metadata?: Record<string, unknown> | null;
  user_metadata?: Record<string, unknown> | null;
};

export type DemoGenerationLimits = {
  total: number;
  sfx: number;
  music: number;
  voice: number;
  maxBatchSize: number;
  maxSfxDurationSeconds: number;
  maxMusicDurationSeconds: number;
};

export function isGenerationEnabled(): boolean {
  return true;
}

export function getDemoGenerationLimits(): DemoGenerationLimits {
  return {
    total: Number.MAX_SAFE_INTEGER,
    sfx: Number.MAX_SAFE_INTEGER,
    music: Number.MAX_SAFE_INTEGER,
    voice: Number.MAX_SAFE_INTEGER,
    maxBatchSize: Number.MAX_SAFE_INTEGER,
    maxSfxDurationSeconds: Number.MAX_SAFE_INTEGER,
    maxMusicDurationSeconds: Number.MAX_SAFE_INTEGER,
  };
}

export function isDemoUser(user: DemoUserLike | null | undefined): boolean {
  void user;
  return false;
}
