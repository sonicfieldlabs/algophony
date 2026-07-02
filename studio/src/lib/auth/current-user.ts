/**
 * Algophony Studio local session helpers.
 *
 * Local workspace identity helpers. These keep the existing API surface stable
 * while routes use local workspace records.
 */

import type { EntitlementKey } from "@/lib/sfx/entitlements";

const LOCAL_USER_ID = process.env.ALGOPHONY_STUDIO_LOCAL_USER_ID ?? "local-workspace";
const LOCAL_EMAIL = process.env.ALGOPHONY_STUDIO_LOCAL_EMAIL ?? "local@algophony.studio";
const LOCAL_CREATED_AT = new Date().toISOString();

export interface LocalUser {
  id: string;
  email: string;
  app_metadata: Record<string, never>;
  user_metadata: Record<string, never>;
  aud: "authenticated";
  created_at: string;
}

export interface UserProfile {
  id: string;
  email: string | null;
  display_name: string | null;
  plan: string;
  monthly_credit_limit: number;
  credits_remaining: number;
  created_at: string;
  updated_at: string;
}

const LOCAL_USER: LocalUser = {
  id: LOCAL_USER_ID,
  email: LOCAL_EMAIL,
  app_metadata: {},
  user_metadata: {},
  aud: "authenticated",
  created_at: LOCAL_CREATED_AT,
};

const LOCAL_PROFILE: UserProfile = {
  id: LOCAL_USER_ID,
  email: LOCAL_EMAIL,
  display_name: "Local Workspace",
  plan: "team",
  monthly_credit_limit: Number.MAX_SAFE_INTEGER,
  credits_remaining: Number.MAX_SAFE_INTEGER,
  created_at: LOCAL_CREATED_AT,
  updated_at: LOCAL_CREATED_AT,
};

const LOCAL_ENTITLEMENTS: EntitlementKey[] = [
  "prompt_browser",
  "saved_prompt_cards",
  "basic_prompt_critic",
  "metadata_import",
  "prompt_pack",
  "batch_prompt_generation",
  "sonic_dna_profiles",
  "export_metadata",
  "priority_generation",
  "supervisor_chat",
  "supervisor_tools",
  "supervisor_advanced",
];

export async function getCurrentUser(): Promise<LocalUser> {
  return LOCAL_USER;
}

export async function requireUser(): Promise<LocalUser> {
  return LOCAL_USER;
}

export async function getCurrentProfile(): Promise<UserProfile> {
  return LOCAL_PROFILE;
}

export async function requireProfile(): Promise<UserProfile> {
  return LOCAL_PROFILE;
}

export async function getUserEntitlements(_userId: string): Promise<string[]> {
  return LOCAL_ENTITLEMENTS;
}

export class AuthError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "AuthError";
    this.status = status;
  }
}

export function unauthorizedResponse(message = "Local session required") {
  return Response.json({ error: message }, { status: 401 });
}
