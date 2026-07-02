"use client";

import { FormEvent, useCallback, useRef, useState } from "react";
import {
  Database,
  FileAudio,
  Loader2,
  Pause,
  Play,
  Plus,
  Search,
  Sparkles,
  Wand2,
} from "lucide-react";
import { useToast } from "@/app/dashboard/toast";
import { useAbortableFetch } from "@/lib/hooks/use-abortable-fetch";
import { cn } from "@/lib/utils";
import type {
  FrequencyRoleId,
  StackerLayer,
  StackerLayerType,
} from "@/lib/sfx/stacker-taxonomy";

export type BrowserSoundAsset = {
  id: string;
  sourceId: string;
  source: "imported" | "generated";
  title: string;
  fileName: string;
  audioUrl: string | null;
  prompt: string;
  promptCandidate: string;
  tags: string[];
  metadata: {
    layerType?: StackerLayerType;
    frequencyRole?: FrequencyRoleId;
    durationSeconds?: number;
    category?: string;
    action?: string;
    material?: string;
  };
  technical: {
    durationSeconds?: number | null;
    sampleRate?: number | null;
    channels?: number | null;
    codec?: string | null;
  };
  provenance: {
    relativePath?: string;
    storagePath?: string | null;
    absolutePath?: string;
    modelId?: string | null;
  };
  stack: {
    suggestedLayerType: StackerLayerType;
    suggestedFrequencyRole: FrequencyRoleId;
    formulaHints: string[];
  };
};

type RecommendationMatch = {
  asset: BrowserSoundAsset;
  score: number;
  reasons: string[];
  formula: string;
};

type Recommendation = {
  layerId: string | null;
  layerType: StackerLayerType;
  frequencyRole: FrequencyRoleId;
  query: string;
  matches: RecommendationMatch[];
};

type Formula = {
  id: string;
  label: string;
  description: string;
  steps: string[];
};

type SearchResponse = {
  assets: BrowserSoundAsset[];
};

type RecommendResponse = {
  recommendations: Recommendation[];
  formulas: Formula[];
};

interface LocalSoundLayerBrowserProps {
  cueDescription: string;
  layers: StackerLayer[];
  onImportAsset: (
    asset: BrowserSoundAsset,
    role?: { layerType: StackerLayerType; frequencyRole: FrequencyRoleId },
  ) => void;
}

export function LocalSoundLayerBrowser({
  cueDescription,
  layers,
  onImportAsset,
}: LocalSoundLayerBrowserProps) {
  const toast = useToast();
  const [query, setQuery] = useState("");
  const [assets, setAssets] = useState<BrowserSoundAsset[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [formulas, setFormulas] = useState<Formula[]>([]);
  const [loading, setLoading] = useState(true);
  const [suggesting, setSuggesting] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const loadAssets = useCallback(async (search: string, signal?: AbortSignal, markLoading = true) => {
    if (markLoading) setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "10" });
      if (search.trim()) params.set("q", search.trim());
      const response = await fetch(`/api/local/assets/search?${params.toString()}`, { signal });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Unable to search sound assets.");
      if (!signal?.aborted) {
        setAssets((data as SearchResponse).assets);
        setRecommendations([]);
      }
    } catch (error) {
      if ((error as Error).name === "AbortError") return;
      toast.error(error instanceof Error ? error.message : "Unable to search sound assets.");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [toast]);

  useAbortableFetch((signal) => loadAssets("", signal, false), [loadAssets]);

  const search = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void loadAssets(query);
  };

  const suggest = async () => {
    setSuggesting(true);
    try {
      const response = await fetch("/api/local/assets/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cueDescription,
          layers: layers.map((layer) => ({
            id: layer.id,
            layerType: layer.layerType,
            frequencyRole: layer.frequencyRole,
            promptText: layer.promptText,
            durationSeconds: layer.durationSeconds,
          })),
          limit: 4,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Unable to recommend assets.");
      const result = data as RecommendResponse;
      setRecommendations(result.recommendations);
      setFormulas(result.formulas);
      toast.success("Layer recommendations updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to recommend assets.");
    } finally {
      setSuggesting(false);
    }
  };

  const play = (asset: BrowserSoundAsset) => {
    if (!asset.audioUrl) return;
    if (playingId === asset.id) {
      audioRef.current?.pause();
      setPlayingId(null);
      return;
    }

    audioRef.current?.pause();
    const audio = new Audio(asset.audioUrl);
    audio.onended = () => setPlayingId(null);
    audio.onpause = () => {
      if (!audio.ended) setPlayingId(null);
    };
    audioRef.current = audio;
    void audio.play();
    setPlayingId(asset.id);
  };

  const hasRecommendations = recommendations.some((recommendation) => recommendation.matches.length > 0);

  return (
    <div className="atlas-card p-4 space-y-3">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-atlas-text-dim flex items-center gap-1">
          <Database className="h-3 w-3" />
          Local + Generated Sound Assets
        </span>
        <div className="flex flex-col gap-2 sm:flex-row">
          <form onSubmit={search} className="flex min-w-0 rounded-xl border border-atlas-border bg-atlas-bg">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search files, tags, prompts"
              className="min-w-0 flex-1 bg-transparent px-3 py-2 text-xs text-atlas-text outline-none placeholder:text-atlas-text-dim"
            />
            <button
              type="submit"
              disabled={loading}
              className="flex w-9 items-center justify-center text-atlas-text-dim transition-colors hover:text-atlas-accent disabled:opacity-50"
              aria-label="Search sound assets"
            >
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
            </button>
          </form>
          <button
            type="button"
            onClick={suggest}
            disabled={suggesting || (!cueDescription.trim() && layers.length === 0)}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-atlas-border bg-atlas-surface px-3 py-2 text-xs font-semibold text-atlas-text-muted transition-colors hover:border-atlas-accent hover:text-atlas-accent disabled:cursor-not-allowed disabled:opacity-50"
          >
            {suggesting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            Suggest
          </button>
        </div>
      </div>

      {hasRecommendations ? (
        <div className="space-y-2">
          {recommendations.filter((recommendation) => recommendation.matches.length > 0).map((recommendation) => (
            <div key={recommendation.layerId ?? recommendation.layerType} className="rounded-xl border border-atlas-border-subtle bg-atlas-bg p-3">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-atlas-text-dim">
                  {recommendation.layerType.replace(/_/g, " ")}
                </span>
                <span className="rounded bg-atlas-accent-muted px-1.5 py-0.5 text-[10px] font-medium text-atlas-accent">
                  {recommendation.frequencyRole.replace(/_/g, " ")}
                </span>
              </div>
              <div className="grid gap-2 lg:grid-cols-2">
                {recommendation.matches.map((match) => (
                  <AssetRow
                    key={`${recommendation.layerId}:${match.asset.id}`}
                    asset={match.asset}
                    active={playingId === match.asset.id}
                    score={match.score}
                    reasons={match.reasons}
                    formula={match.formula}
                    onPlay={play}
                    onImport={() => onImportAsset(match.asset, {
                      layerType: recommendation.layerType,
                      frequencyRole: recommendation.frequencyRole,
                    })}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid gap-2 lg:grid-cols-2">
          {assets.map((asset) => (
            <AssetRow
              key={asset.id}
              asset={asset}
              active={playingId === asset.id}
              onPlay={play}
              onImport={() => onImportAsset(asset)}
            />
          ))}
          {!loading && assets.length === 0 && (
            <div className="rounded-xl border border-dashed border-atlas-border-subtle bg-atlas-bg px-3 py-4 text-sm text-atlas-text-muted">
              Indexed sounds and generated files will appear here after scanning a folder or generating audio.
            </div>
          )}
        </div>
      )}

      {formulas.length > 0 && (
        <div className="grid gap-2 md:grid-cols-2">
          {formulas.map((formula) => (
            <div key={formula.id} className="rounded-xl border border-atlas-border-subtle bg-atlas-bg px-3 py-2">
              <div className="text-xs font-semibold text-atlas-text">{formula.label}</div>
              <p className="mt-1 text-[10px] leading-relaxed text-atlas-text-muted">{formula.description}</p>
              {formula.steps.length > 0 && (
                <div className="mt-2 space-y-1">
                  {formula.steps.slice(0, 4).map((step) => (
                    <div key={step} className="truncate font-mono text-[9px] text-atlas-text-dim">{step}</div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AssetRow({
  asset,
  active,
  score,
  reasons,
  formula,
  onPlay,
  onImport,
}: {
  asset: BrowserSoundAsset;
  active: boolean;
  score?: number;
  reasons?: string[];
  formula?: string;
  onPlay: (asset: BrowserSoundAsset) => void;
  onImport: () => void;
}) {
  const role = asset.stack.suggestedLayerType.replace(/_/g, " ");
  const duration = asset.technical.durationSeconds;

  return (
    <div className="rounded-xl border border-atlas-border-subtle bg-atlas-surface p-2.5">
      <div className="flex items-start gap-2">
        <button
          type="button"
          onClick={() => onPlay(asset)}
          disabled={!asset.audioUrl}
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition-colors",
            active
              ? "border-atlas-accent bg-atlas-accent-muted text-atlas-accent"
              : "border-atlas-border-subtle bg-atlas-bg text-atlas-text-muted hover:border-atlas-accent hover:text-atlas-accent",
            !asset.audioUrl && "cursor-not-allowed opacity-50",
          )}
          aria-label={active ? "Pause asset" : "Play asset"}
        >
          {asset.audioUrl ? (active ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />) : <FileAudio className="h-4 w-4" />}
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="truncate text-xs font-semibold text-atlas-text">{asset.title}</span>
            <span className="rounded bg-atlas-bg px-1.5 py-0.5 text-[9px] font-semibold uppercase text-atlas-text-dim">
              {asset.source}
            </span>
            {score !== undefined && (
              <span className="rounded bg-atlas-accent-muted px-1.5 py-0.5 text-[9px] font-medium text-atlas-accent">
                {Math.round(score)}
              </span>
            )}
          </div>
          <div className="mt-1 truncate font-mono text-[9px] text-atlas-text-dim">
            {asset.provenance.relativePath ?? asset.provenance.storagePath ?? asset.fileName}
          </div>
          <div className="mt-1 flex flex-wrap gap-1">
            <span className="rounded bg-atlas-bg px-1.5 py-0.5 text-[9px] text-atlas-text-muted">{role}</span>
            <span className="rounded bg-atlas-bg px-1.5 py-0.5 text-[9px] text-atlas-text-muted">
              {asset.stack.suggestedFrequencyRole.replace(/_/g, " ")}
            </span>
            {duration ? (
              <span className="rounded bg-atlas-bg px-1.5 py-0.5 text-[9px] text-atlas-text-muted">
                {duration.toFixed(1)}s
              </span>
            ) : null}
          </div>
        </div>
        <button
          type="button"
          onClick={onImport}
          className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-atlas-border bg-atlas-bg px-2 py-1.5 text-[10px] font-semibold text-atlas-text-muted transition-colors hover:border-atlas-accent hover:text-atlas-accent"
        >
          <Plus className="h-3 w-3" />
          Layer
        </button>
      </div>
      {(reasons?.length || formula) && (
        <div className="mt-2 border-t border-atlas-border-subtle pt-2">
          {reasons?.length ? (
            <div className="mb-1 flex flex-wrap gap-1">
              {reasons.slice(0, 3).map((reason) => (
                <span key={reason} className="rounded bg-atlas-bg px-1.5 py-0.5 text-[9px] text-atlas-text-muted">
                  {reason}
                </span>
              ))}
            </div>
          ) : null}
          {formula ? (
            <p className="flex gap-1 text-[10px] leading-relaxed text-atlas-text-muted">
              <Wand2 className="mt-0.5 h-3 w-3 shrink-0 text-atlas-accent" />
              <span>{formula}</span>
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
