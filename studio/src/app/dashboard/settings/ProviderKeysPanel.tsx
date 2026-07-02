"use client";

import { FormEvent, useCallback, useState } from "react";
import { CheckCircle, KeyRound, Loader2, Trash2, XCircle } from "lucide-react";
import { useAbortableFetch } from "@/lib/hooks/use-abortable-fetch";
import { useToast } from "@/app/dashboard/toast";
import { cn } from "@/lib/utils";

type ProviderKeyStatus = {
  provider: "elevenlabs";
  configured: boolean;
  source: "local" | "environment" | "missing";
  keyHint: string | null;
  updatedAt: string | null;
};

export function ProviderKeysPanel() {
  const toast = useToast();
  const [apiKey, setApiKey] = useState("");
  const [status, setStatus] = useState<ProviderKeyStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [clearing, setClearing] = useState(false);

  const loadStatus = useCallback(async (signal?: AbortSignal) => {
    if (!signal?.aborted) setLoading(true);
    try {
      const response = await fetch("/api/local/provider-settings", { signal });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Unable to read provider settings.");
      if (!signal?.aborted) setStatus(data.elevenlabs);
    } catch (error) {
      if ((error as Error).name === "AbortError") return;
      toast.error(error instanceof Error ? error.message : "Unable to read provider settings.");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [toast]);

  useAbortableFetch(loadStatus, [loadStatus]);

  const saveKey = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    try {
      const response = await fetch("/api/local/provider-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Unable to save provider key.");
      setStatus(data.elevenlabs);
      setApiKey("");
      toast.success("ElevenLabs key saved locally.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save provider key.");
    } finally {
      setSaving(false);
    }
  };

  const clearKey = async () => {
    setClearing(true);
    try {
      const response = await fetch("/api/local/provider-settings", { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Unable to clear provider key.");
      setStatus(data.elevenlabs);
      toast.success("Local ElevenLabs key cleared.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to clear provider key.");
    } finally {
      setClearing(false);
    }
  };

  const configured = Boolean(status?.configured);
  const StatusIcon = configured ? CheckCircle : XCircle;

  return (
    <div className="space-y-4">
      <div className="atlas-card p-6 space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold text-atlas-text flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-atlas-accent" />
              Provider keys
            </h2>
            <p className="text-sm text-atlas-text-muted mt-2 max-w-2xl leading-relaxed">
              Store a personal ElevenLabs API key in the local workspace only if you want provider calls. Generation, speech, music, isolation, and agent features use your own account; local organization works without a key.
            </p>
          </div>
          <div className={cn(
            "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold",
            configured ? "bg-atlas-success/10 text-atlas-success" : "bg-atlas-danger/10 text-atlas-danger"
          )}>
            <StatusIcon className="h-3.5 w-3.5" />
            {loading ? "Checking" : configured ? "Configured" : "Missing"}
          </div>
        </div>

        <div className="rounded-xl border border-atlas-border-subtle bg-atlas-bg/60 p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="text-sm font-medium text-atlas-text">ElevenLabs</div>
              <div className="text-xs text-atlas-text-muted mt-1">
                {status?.keyHint
                  ? `${status.keyHint} from ${status.source === "local" ? "local workspace" : "environment"}`
                  : "No API key configured yet."}
              </div>
            </div>
            {status?.source === "local" && (
              <button
                type="button"
                onClick={clearKey}
                disabled={clearing}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-atlas-border bg-atlas-surface px-3 py-2 text-xs font-semibold text-atlas-text-muted transition-colors hover:border-atlas-danger/40 hover:text-atlas-danger disabled:opacity-60"
              >
                {clearing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                Clear local key
              </button>
            )}
          </div>
        </div>

        <form onSubmit={saveKey} className="space-y-3">
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wider text-atlas-text-dim">ElevenLabs API key</span>
            <input
              value={apiKey}
              onChange={(event) => setApiKey(event.target.value)}
              type="password"
              autoComplete="off"
              placeholder="Paste your ElevenLabs key"
              className="mt-2 w-full rounded-xl border border-atlas-border bg-atlas-bg px-3 py-2.5 text-sm text-atlas-text outline-none transition-colors placeholder:text-atlas-text-dim focus:border-atlas-accent"
            />
          </label>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <p className="text-xs text-atlas-text-dim leading-relaxed">
              Saved to <span className="font-mono">.algophony-studio/provider-settings.json</span> with restrictive file permissions on supported systems. This file is ignored by git.
            </p>
            <button
              type="submit"
              disabled={saving || apiKey.trim().length < 10}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-atlas-accent px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-atlas-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
              Save key locally
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
