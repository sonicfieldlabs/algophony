import "server-only";

import { NextResponse } from "next/server";
import {
  GENERATION_DISABLED_MESSAGE,
  getDemoGenerationLimits,
  isGenerationEnabled,
  type DemoGenerationKind,
  type DemoGenerationLimits,
  type DemoUserLike,
} from "@/lib/demo/config";

type DemoUsage = {
  total: number;
  sfx: number;
  music: number;
  voice: number;
  hybrid: number;
};

export class GenerationPolicyError extends Error {
  status: number;
  code: string;

  constructor(message: string, status: number, code: string) {
    super(message);
    this.name = "GenerationPolicyError";
    this.status = status;
    this.code = code;
  }
}

export function buildGenerationPolicyResponse(error: GenerationPolicyError) {
  return NextResponse.json(
    { error: error.message, code: error.code },
    { status: error.status },
  );
}

export function getDemoProfileCreditLimit(): number {
  return getDemoGenerationLimits().total;
}

export async function isDemoUserId(_userId: string): Promise<boolean> {
  return false;
}

export async function enforceGenerationPolicy(
  user: DemoUserLike & { id: string },
  opts: {
    kind: DemoGenerationKind;
    requestedCount?: number;
    durationSeconds?: number | null;
  },
): Promise<{ isDemo: boolean; usage: DemoUsage | null; limits: DemoGenerationLimits }> {
  if (!isGenerationEnabled()) {
    throw new GenerationPolicyError(GENERATION_DISABLED_MESSAGE, 503, "GENERATION_DISABLED");
  }

  void user;
  void opts;
  return { isDemo: false, usage: null, limits: getDemoGenerationLimits() };
}
