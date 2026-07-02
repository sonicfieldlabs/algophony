import "server-only";

import { chmodSync, existsSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ensureAlgophonyStudioDir, readWorkspaceManifest } from "./workspace";

type ProviderSettingsStore = {
  elevenlabs?: {
    apiKey?: string;
    updatedAt?: string;
  };
};

export type ProviderKeySource = "local" | "environment" | "missing";

export interface ProviderKeyStatus {
  provider: "elevenlabs";
  configured: boolean;
  source: ProviderKeySource;
  keyHint: string | null;
  updatedAt: string | null;
}

function getProviderSettingsPath(): string {
  return join(ensureAlgophonyStudioDir(), "provider-settings.json");
}

function readStore(): ProviderSettingsStore {
  const path = getProviderSettingsPath();
  if (!existsSync(path)) return {};

  try {
    return JSON.parse(readFileSync(path, "utf8")) as ProviderSettingsStore;
  } catch {
    return {};
  }
}

function writeStore(store: ProviderSettingsStore): void {
  const path = getProviderSettingsPath();
  writeFileSync(path, JSON.stringify(store, null, 2), { encoding: "utf8", mode: 0o600 });
  chmodSync(path, 0o600);
}

function keyHint(key: string): string {
  return `...${key.slice(-4)}`;
}

export function readElevenLabsApiKeySync(): string | null {
  const localKey = readStore().elevenlabs?.apiKey?.trim();
  if (localKey) return localKey;

  const envKey = process.env.ELEVENLABS_API_KEY?.trim();
  return envKey || null;
}

export function getElevenLabsKeyStatus(): ProviderKeyStatus {
  readWorkspaceManifest();
  const store = readStore();
  const localKey = store.elevenlabs?.apiKey?.trim();
  if (localKey) {
    return {
      provider: "elevenlabs",
      configured: true,
      source: "local",
      keyHint: keyHint(localKey),
      updatedAt: store.elevenlabs?.updatedAt ?? null,
    };
  }

  const envKey = process.env.ELEVENLABS_API_KEY?.trim();
  if (envKey) {
    return {
      provider: "elevenlabs",
      configured: true,
      source: "environment",
      keyHint: keyHint(envKey),
      updatedAt: null,
    };
  }

  return {
    provider: "elevenlabs",
    configured: false,
    source: "missing",
    keyHint: null,
    updatedAt: null,
  };
}

export function saveElevenLabsApiKey(apiKey: string): ProviderKeyStatus {
  const cleaned = apiKey.trim();
  if (cleaned.length < 10) {
    throw new Error("ElevenLabs API key is too short.");
  }

  const store = readStore();
  writeStore({
    ...store,
    elevenlabs: {
      apiKey: cleaned,
      updatedAt: new Date().toISOString(),
    },
  });
  return getElevenLabsKeyStatus();
}

export function clearElevenLabsApiKey(): ProviderKeyStatus {
  const path = getProviderSettingsPath();
  const store = readStore();
  delete store.elevenlabs;

  if (Object.keys(store).length === 0) {
    if (existsSync(path)) unlinkSync(path);
  } else {
    writeStore(store);
  }

  return getElevenLabsKeyStatus();
}
