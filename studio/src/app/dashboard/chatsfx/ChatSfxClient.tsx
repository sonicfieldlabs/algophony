"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  Send,
  Sparkles,
  Orbit,
  User,
  Loader2,
  ListChecks,
  Layers,
  Wand2,
  CloudFog,
  Footprints,
  SlidersHorizontal,
  Bug,
  Users as UsersIcon,
  Car,
  Candy as CandyIcon,
  Waves,
  AudioWaveform,
  Settings2,
  PlayCircle,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  RefreshCcw,
  Zap,
  Repeat,
  Clock,
  Plus,
  Lightbulb,
  Trash2,
  History,
  MessageSquare,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  X,
  Cpu,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useToast } from "@/app/dashboard/toast";
import { getPlanFeatures } from "@/lib/sfx/feature-matrix";
import { autoFilename, buildAutoName } from "@/lib/sfx/auto-name";

// ── Types ────────────────────────────────────────────────────

type ChatRole = "user" | "assistant" | "system";

interface Cue {
  cue_number: number;
  title: string;
  category: string;
  generated_prompt: string;
  duration_seconds?: number;
  loop?: boolean;
  prompt_influence?: number;
}

interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  timestamp: number;
  tool?: {
    name: string;
    status: "pending" | "completed" | "failed";
  };
  // Structured output. Renderers below switch on `kind` to render rich UI.
  payload?:
    | { kind: "cues"; cues: Cue[]; scene: string }
    | { kind: "layer_plan"; layers: { role: string; description: string }[]; cues: Cue[] }
    | { kind: "batch_result"; results: BatchResult[] }
    | { kind: "single_result"; result: BatchResult }
    | { kind: "estimate"; credits: number; chars: number; gens: number }
    | { kind: "routing"; suggestions: ToolRouting[] };
}

interface BatchResult {
  cue: Cue;
  status: "pending" | "succeeded" | "failed";
  audioUrl?: string;
  generationId?: string;
  error?: string;
}

interface ToolRouting {
  label: string;
  href: string;
  icon: keyof typeof TOOL_ICONS;
  description: string;
  hint?: string;
}

// ── Tool icons map ──

const TOOL_ICONS = {
  generic: AudioWaveform,
  creature: Bug,
  human: UsersIcon,
  candy: CandyIcon,
  vehicle: Car,
  foley: Footprints,
  synth: Waves,
  atmosphere: CloudFog,
  ui: SlidersHorizontal,
  image: Wand2,
} as const;

// Hand-curated routing — maps cue categories to specialised lab pages so
// users can go deeper than the generic generator if they want to.
const CATEGORY_ROUTES: Record<string, ToolRouting> = {
  Footsteps: { label: "Foley Room", href: "/dashboard/foley-room", icon: "foley", description: "Body, gesture, surface, material" },
  Water: { label: "Foley Room", href: "/dashboard/foley-room", icon: "foley", description: "Liquid + surface design" },
  Creature: { label: "Creature Lab", href: "/dashboard/creature-lab", icon: "creature", description: "Multi-layer creature design" },
  Animal: { label: "Creature Lab", href: "/dashboard/creature-lab", icon: "creature", description: "Vocals + movement layers" },
  Vehicle: { label: "Vehicle Lab", href: "/dashboard/vehicle", icon: "vehicle", description: "Engines, brakes, tires, rockets" },
  Ambience: { label: "Atmosphere", href: "/dashboard/atmosphere-builder", icon: "atmosphere", description: "Layered soundscapes + beds" },
  Weather: { label: "Atmosphere", href: "/dashboard/atmosphere-builder", icon: "atmosphere", description: "Storm/rain beds" },
  UI: { label: "UI Elements", href: "/dashboard/ui-elements", icon: "ui", description: "Interface + notification design" },
  Magic: { label: "Misc", href: "/dashboard/candy", icon: "candy", description: "Pushes, artifacts, sparkles" },
  Horror: { label: "Human Lab", href: "/dashboard/human-lab", icon: "human", description: "Breaths, screams, reactions" },
};

const DEFAULT_ROUTE: ToolRouting = {
  label: "Generic Generator",
  href: "/dashboard/generate",
  icon: "generic",
  description: "Open-ended sound generation",
};

// ── Settings panel state ────────────────────────────────────

interface GenerationSettings {
  durationSeconds: number;
  loop: boolean;
  promptInfluence: number;
  modelId: string;
  outputFormat: string;
  exclusions: string[];
}

const DEFAULT_SETTINGS: GenerationSettings = {
  durationSeconds: 4,
  loop: false,
  promptInfluence: 0.3,
  modelId: "eleven_text_to_sound_v2",
  outputFormat: "mp3_44100_128",
  exclusions: ["no music", "no dialogue"],
};

// ── Chat history persistence ─────────────────────────────────
//
// Sessions live in localStorage so navigating away from ChatSFX (or
// reloading the tab) doesn't wipe the conversation. The active session's
// messages are mirrored back to the store on every change.

const HISTORY_STORAGE_KEY = "atlas-chatsfx-history-v1";
const MAX_SESSIONS = 30;

const WELCOME_TEXT = "Tell me what you are making: a scene, soundscape, Foley action, UI sound, musical texture, creature, human expression, image-to-sound idea, or export workflow. I can help turn it into cues, layers, prompt cards and a production-ready sound stack.";

// Stable reference used as the pre-hydration view of `messages`. Defined at
// module scope so it doesn't get re-created on every render (which would
// fail the react-hooks/purity rule).
const FALLBACK_MESSAGES: ChatMessage[] = [
  {
    id: "welcome-fallback",
    role: "assistant",
    content: WELCOME_TEXT,
    timestamp: 0,
  },
];

interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}

interface ChatHistory {
  sessions: ChatSession[];
  activeId: string | null;
}

function makeSession(): ChatSession {
  const id = `chat-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  return {
    id,
    title: "New chat",
    messages: [
      {
        id: `welcome-${id}`,
        role: "assistant",
        content: WELCOME_TEXT,
        timestamp: Date.now(),
      },
    ],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

function loadHistory(): ChatHistory {
  if (typeof window === "undefined") return { sessions: [], activeId: null };
  try {
    const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
    if (!raw) return { sessions: [], activeId: null };
    const parsed = JSON.parse(raw) as ChatHistory;
    return {
      sessions: Array.isArray(parsed?.sessions) ? parsed.sessions.slice(0, MAX_SESSIONS) : [],
      activeId: typeof parsed?.activeId === "string" ? parsed.activeId : null,
    };
  } catch {
    return { sessions: [], activeId: null };
  }
}

function saveHistory(h: ChatHistory) {
  try {
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify({
      sessions: h.sessions.slice(0, MAX_SESSIONS),
      activeId: h.activeId,
    }));
  } catch {
    // localStorage full or unavailable — fail silently.
  }
}

function deriveTitle(messages: ChatMessage[], current: string): string {
  if (current && current !== "New chat") return current;
  const firstUser = messages.find((m) => m.role === "user");
  if (!firstUser) return current || "New chat";
  const text = firstUser.content.trim().replace(/\s+/g, " ");
  return text.length > 42 ? text.slice(0, 42) + "…" : text;
}

function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d`;
}

// ── Component ───────────────────────────────────────────────

interface Props {
  plan: string;
  creditsRemaining: number;
}

export function ChatSfxClient({ plan, creditsRemaining: initialCredits }: Props) {
  const router = useRouter();
  const toast = useToast();
  const features = getPlanFeatures(plan);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollEndRef = useRef<HTMLDivElement>(null);

  // Sessions are the single source of truth — `messages` is a derived view
  // of the currently-active session, exposed through a `setMessages` wrapper
  // that updates that session in place. This keeps state co-located and
  // lets us persist the whole thing with a single localStorage write.
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  // History rail starts collapsed — surfaces only when the user opts in.
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyHydrated, setHistoryHydrated] = useState(false);

  const messages = useMemo<ChatMessage[]>(() => {
    const active = sessions.find((s) => s.id === activeChatId);
    if (active) return active.messages;
    return FALLBACK_MESSAGES;
  }, [sessions, activeChatId]);

  const setMessages = useCallback(
    (
      updater:
        | ChatMessage[]
        | ((prev: ChatMessage[]) => ChatMessage[])
    ) => {
      setSessions((prev) => {
        const idx = prev.findIndex((s) => s.id === activeChatId);
        if (idx === -1) return prev;
        const current = prev[idx];
        const nextMessages =
          typeof updater === "function"
            ? (updater as (m: ChatMessage[]) => ChatMessage[])(current.messages)
            : updater;
        if (nextMessages === current.messages) return prev;
        const next = [...prev];
        next[idx] = {
          ...current,
          messages: nextMessages,
          title: deriveTitle(nextMessages, current.title),
          updatedAt: Date.now(),
        };
        return next;
      });
    },
    [activeChatId]
  );

  const [input, setInput] = useState("");
  const [creditsRemaining, setCreditsRemaining] = useState(initialCredits);
  const [sending, setSending] = useState(false);
  const [batching, setBatching] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settings, setSettings] = useState<GenerationSettings>(DEFAULT_SETTINGS);
  const [sessionId, setSessionId] = useState<string | null>(null);

  // ── Voice input (Web Speech API) ──
  const [listening, setListening] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);

  const toggleListening = useCallback(() => {
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }
    const SpeechRecognitionCtor =
      (typeof window !== "undefined" &&
        ((window as unknown as Record<string, unknown>).SpeechRecognition ||
          (window as unknown as Record<string, unknown>).webkitSpeechRecognition)) as
        | (new () => unknown)
        | undefined;
    if (!SpeechRecognitionCtor) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recognition = new SpeechRecognitionCtor() as any;
    recognition.lang = "en-US";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognitionRef.current = recognition;

    let finalTranscript = "";

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript + " ";
        } else {
          interim += transcript;
        }
      }
      setInput((prev) => {
        // Replace interim section with current recognition
        const base = prev.replace(/\u200b.*$/, "").trimEnd();
        const combined = (base ? base + " " : "") + finalTranscript + (interim ? "\u200b" + interim : "");
        return combined;
      });
    };

    recognition.onend = () => {
      setListening(false);
      // Clean up zero-width space markers
      setInput((prev) => prev.replace(/\u200b/g, ""));
    };

    recognition.onerror = () => {
      setListening(false);
    };

    recognition.start();
    setListening(true);
  }, [listening]);

  // Keep credits in sync with generations from anywhere.
  useEffect(() => {
    function handler(e: Event) {
      const detail = (e as CustomEvent<{ creditsRemaining: number }>).detail;
      if (typeof detail?.creditsRemaining === "number") {
        setCreditsRemaining(detail.creditsRemaining);
      }
    }
    window.addEventListener("atlas:credits", handler as EventListener);
    return () => window.removeEventListener("atlas:credits", handler as EventListener);
  }, []);

  // Auto-scroll on new messages.
  useEffect(() => {
    scrollEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Init a supervisor session in the background — used by tools that
  // require one. Failure is non-blocking; client-side scene breakdown still
  // works without a session.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch("/api/supervisor/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mode: "supervisor", page_context: "/dashboard/chatsfx" }),
        });
        if (!r.ok) return;
        const data = await r.json();
        if (!cancelled && data?.session?.id) setSessionId(data.session.id);
      } catch {
        // Non-fatal — proceed without session.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Hydrate chat history from localStorage on mount and pick up the
  // last-active session so navigating back to ChatSFX feels continuous.
  // This is the canonical "sync React state with an external store" pattern;
  // the cascading-render warning doesn't apply because it runs once.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const stored = loadHistory();
    if (stored.sessions.length === 0) {
      const seed = makeSession();
      setSessions([seed]);
      setActiveChatId(seed.id);
      saveHistory({ sessions: [seed], activeId: seed.id });
    } else {
      const active = stored.sessions.find((s) => s.id === stored.activeId) ?? stored.sessions[0];
      setSessions(stored.sessions);
      setActiveChatId(active.id);
    }
    setHistoryHydrated(true);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Persist sessions on any change after hydration. Pure side-effect — no
  // setState here, so it won't cascade.
  useEffect(() => {
    if (!historyHydrated) return;
    saveHistory({ sessions, activeId: activeChatId });
  }, [sessions, activeChatId, historyHydrated]);

  // ── Session controls ──
  // `messages` is derived from sessions + activeChatId, so these only need
  // to update those two state slices; the messages view follows automatically.
  const startNewChat = useCallback(() => {
    const fresh = makeSession();
    setSessions((prev) => [fresh, ...prev].slice(0, MAX_SESSIONS));
    setActiveChatId(fresh.id);
    setInput("");
  }, []);

  const switchChat = useCallback(
    (id: string) => {
      if (id === activeChatId) return;
      setActiveChatId(id);
    },
    [activeChatId]
  );

  const deleteChat = useCallback(
    (id: string) => {
      setSessions((prev) => {
        const remaining = prev.filter((s) => s.id !== id);
        if (remaining.length === 0) {
          const seed = makeSession();
          setActiveChatId(seed.id);
          return [seed];
        }
        if (activeChatId === id) {
          setActiveChatId(remaining[0].id);
        }
        return remaining;
      });
    },
    [activeChatId]
  );

  // ── Helpers ──

  const appendMessage = useCallback((m: Omit<ChatMessage, "id" | "timestamp"> & Partial<Pick<ChatMessage, "id" | "timestamp">>) => {
    setMessages((prev) => [
      ...prev,
      {
        id: m.id ?? `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        timestamp: m.timestamp ?? Date.now(),
        ...m,
      },
    ]);
  }, [setMessages]);

  const updateLastAssistant = useCallback((mut: (m: ChatMessage) => ChatMessage) => {
    setMessages((prev) => {
      for (let i = prev.length - 1; i >= 0; i--) {
        if (prev[i].role === "assistant") {
          const next = [...prev];
          next[i] = mut(next[i]);
          return next;
        }
      }
      return prev;
    });
  }, [setMessages]);

  // ── Send handler ──

  const handleSend = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || sending) return;

    appendMessage({ role: "user", content: trimmed });
    setInput("");
    setSending(true);

    // Acknowledge typing.
    const thinkingId = `thinking-${Date.now()}`;
    appendMessage({ id: thinkingId, role: "assistant", content: "Thinking…", tool: { name: "create_sound_cue_list", status: "pending" } });

    try {
      const r = await fetch("/api/supervisor/tools/create_sound_cue_list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId ?? "",
          scene_description: trimmed,
        }),
      });
      const data = await r.json();

      if (!r.ok || !data?.success) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === thinkingId
              ? {
                  ...m,
                  content: data?.error ?? "I couldn't process that. Try rephrasing — describe the scene, the medium, and any sounds you already have in mind.",
                  tool: { name: "create_sound_cue_list", status: "failed" },
                }
              : m
          )
        );
        return;
      }

      const cues = (data.data?.cues ?? []) as Cue[];
      const intro =
        cues.length === 0
          ? "I couldn't detect specific cues in that. Try giving me more concrete scene details (location, action, characters, weather, props)."
          : `I identified ${cues.length} sound cue${cues.length === 1 ? "" : "s"} for this scene. Pick what you want next — I can build prompt cards, generate the audio, or hand each cue off to a deeper tool.`;

      setMessages((prev) =>
        prev.map((m) =>
          m.id === thinkingId
            ? {
                ...m,
                content: intro,
                tool: { name: "create_sound_cue_list", status: "completed" },
                payload: cues.length > 0 ? { kind: "cues", cues, scene: trimmed } : undefined,
              }
            : m
        )
      );

      // Auto-suggest routing.
      if (cues.length > 0) {
        const suggestions = suggestRouting(cues);
        if (suggestions.length > 0) {
          appendMessage({
            role: "assistant",
            content: "Some of these cues have specialised tools that will give you better results than the generic generator:",
            payload: { kind: "routing", suggestions },
          });
        }
      }
    } catch (err) {
      const detail = err instanceof Error ? err.message : "Network error";
      setMessages((prev) =>
        prev.map((m) =>
          m.id === thinkingId
            ? {
                ...m,
                content: `Couldn't reach Wilhelm — ${detail}`,
                tool: { name: "create_sound_cue_list", status: "failed" },
              }
            : m
        )
      );
    } finally {
      setSending(false);
    }
  }, [input, sending, sessionId, appendMessage, setMessages]);

  // ── Generate a single cue ──

  const generateCue = useCallback(async (cue: Cue): Promise<BatchResult> => {
    try {
      const r = await fetch("/api/elevenlabs/generate-sfx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: cue.generated_prompt,
          duration_seconds: cue.duration_seconds ?? settings.durationSeconds,
          loop: cue.loop ?? settings.loop,
          prompt_influence: cue.prompt_influence ?? settings.promptInfluence,
          model_id: settings.modelId,
          output_format: settings.outputFormat,
          exclusion_constraints: settings.exclusions,
        }),
      });
      const data = await r.json();
      if (!r.ok) {
        return { cue, status: "failed", error: data?.error ?? `HTTP ${r.status}` };
      }
      if (typeof data.creditsRemaining === "number") {
        setCreditsRemaining(data.creditsRemaining);
        window.dispatchEvent(new CustomEvent("atlas:credits", {
          detail: { creditsRemaining: data.creditsRemaining },
        }));
      }
      const auto = buildAutoName({ prompt: cue.generated_prompt, category: "sfx" });
      const filename = autoFilename(
        { prompt: cue.generated_prompt, category: "sfx" },
        settings.outputFormat.includes("wav") ? "wav" : "mp3"
      );
      // Push into the global audio player.
      window.dispatchEvent(new CustomEvent("atlas:generation", {
        detail: {
          id: data.generationId,
          url: data.audioUrl,
          title: auto.displayName,
          longName: auto.longName,
          filename,
          prompt: cue.generated_prompt,
          category: cue.category,
          duration: cue.duration_seconds ?? settings.durationSeconds,
          createdAt: Date.now(),
        },
      }));
      return {
        cue,
        status: "succeeded",
        audioUrl: data.audioUrl,
        generationId: data.generationId,
      };
    } catch (err) {
      return {
        cue,
        status: "failed",
        error: err instanceof Error ? err.message : "Network error",
      };
    }
  }, [settings]);

  const handleGenerateOne = useCallback(async (cue: Cue) => {
    appendMessage({
      role: "assistant",
      content: `Generating "${cue.title}"…`,
      tool: { name: "generate_sfx_from_prompt_card", status: "pending" },
    });
    const result = await generateCue(cue);
    updateLastAssistant((m) => ({
      ...m,
      content:
        result.status === "succeeded"
          ? `"${cue.title}" generated. It's now playing in the bottom player.`
          : `Failed: ${result.error}`,
      tool: {
        name: "generate_sfx_from_prompt_card",
        status: result.status === "succeeded" ? "completed" : "failed",
      },
      payload: { kind: "single_result", result },
    }));
  }, [generateCue, appendMessage, updateLastAssistant]);

  const handleGenerateAll = useCallback(async (cues: Cue[]) => {
    if (!features.batchGeneration) {
      toast.error("Batch generation is unavailable in this local workspace session");
      return;
    }
    const cost = cues.length;
    if (creditsRemaining < cost) {
      toast.error(`Provider quota is too low — need ${cost}, have ${creditsRemaining}`);
      return;
    }
    setBatching(true);

    appendMessage({
      role: "assistant",
      content: `Generating ${cues.length} sounds (${cost} provider calls). I'll add each to the player as it finishes.`,
      tool: { name: "generate_variation_batch", status: "pending" },
    });

    const results: BatchResult[] = [];
    for (const cue of cues) {
      const result = await generateCue(cue);
      results.push(result);
      // Update with running progress.
      updateLastAssistant((m) => ({
        ...m,
        content: `Generated ${results.filter((r) => r.status === "succeeded").length} of ${cues.length}…`,
        payload: { kind: "batch_result", results: [...results] },
      }));
    }

    const succeeded = results.filter((r) => r.status === "succeeded").length;
    updateLastAssistant((m) => ({
      ...m,
      content: `Batch done: ${succeeded} of ${cues.length} generated.`,
      tool: {
        name: "generate_variation_batch",
        status: succeeded === cues.length ? "completed" : "failed",
      },
      payload: { kind: "batch_result", results },
    }));
    setBatching(false);
  }, [creditsRemaining, features.batchGeneration, generateCue, appendMessage, updateLastAssistant, toast]);

  // ── Route to specialised tool ──

  const handleRouteToTool = useCallback((cue: Cue) => {
    const route = CATEGORY_ROUTES[cue.category] ?? DEFAULT_ROUTE;
    // Store the prompt for the destination tool to pick up.
    try {
      localStorage.setItem("algophony-studio-route-payload", JSON.stringify({
        destination: route.label,
        payload: {
          prompt: cue.generated_prompt,
          category: cue.category,
          duration: cue.duration_seconds ?? settings.durationSeconds,
          promptInfluence: cue.prompt_influence ?? settings.promptInfluence,
          loop: cue.loop ?? settings.loop,
          sourceRoute: "chatsfx",
        },
        timestamp: Date.now(),
      }));
    } catch {
      // ignore
    }
    const params = new URLSearchParams({
      text: cue.generated_prompt,
      category: cue.category,
    });
    router.push(`${route.href}?${params.toString()}`);
  }, [router, settings]);

  // ── Estimate provider calls ──

  const handleEstimate = useCallback((cues: Cue[]) => {
    const credits = cues.length;
    const chars = cues.reduce((sum, c) => sum + c.generated_prompt.length, 0);
    appendMessage({
      role: "assistant",
      content: `Estimated provider calls: ${credits} for ${cues.length} sounds (~${chars} characters).`,
      payload: { kind: "estimate", credits, chars, gens: cues.length },
      tool: { name: "estimate_generation_cost", status: "completed" },
    });
  }, [appendMessage]);

  // ── Layer plan ──

  const handleLayerPlan = useCallback(async (scene: string) => {
    appendMessage({
      role: "assistant",
      content: "Building a layered sound plan…",
      tool: { name: "create_layer_plan", status: "pending" },
    });
    try {
      const r = await fetch("/api/supervisor/tools/create_layer_plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId ?? "", scene_description: scene }),
      });
      const data = await r.json();
      if (!r.ok || !data?.success) {
        updateLastAssistant((m) => ({
          ...m,
          content: data?.error ?? "Couldn't build a layer plan.",
          tool: { name: "create_layer_plan", status: "failed" },
        }));
        return;
      }
      updateLastAssistant((m) => ({
        ...m,
        content: "Here's a layered plan with one cue per layer role. Promote anything to a prompt card and I can generate it.",
        tool: { name: "create_layer_plan", status: "completed" },
        payload: {
          kind: "layer_plan",
          layers: data.data?.layers ?? [],
          cues: (data.data?.assigned_cues ?? []).map((c: { title: string; category: string; prompt: string }, i: number) => ({
            cue_number: i + 1,
            title: c.title,
            category: c.category,
            generated_prompt: c.prompt,
          })) as Cue[],
        },
      }));
    } catch (err) {
      const detail = err instanceof Error ? err.message : "Network error";
      updateLastAssistant((m) => ({
        ...m,
        content: `Couldn't build a layer plan — ${detail}`,
        tool: { name: "create_layer_plan", status: "failed" },
      }));
    }
  }, [appendMessage, updateLastAssistant, sessionId]);

  // ── Render ──

  const lastCues = useMemo(() => {
    const found = messages.findLast(
      (m) => m.payload?.kind === "cues" || m.payload?.kind === "layer_plan"
    );
    if (!found?.payload) return null;
    if (found.payload.kind === "cues") {
      return { scene: found.payload.scene, cues: found.payload.cues };
    }
    if (found.payload.kind === "layer_plan") {
      return { scene: "", cues: found.payload.cues };
    }
    return null;
  }, [messages]);

  // ── Legacy access fallback (after all hooks so hook order stays stable) ──
  if (plan === "free") {
    return <FreeTierGate />;
  }

  return (
    <div className="flex flex-col h-full max-h-[calc(100vh-56px)] animate-fade-in">

      <div className="relative flex flex-1 min-h-0">
        {/* ── Chat column ── */}
        <div className="flex flex-1 flex-col min-w-0">
          <div className="flex-1 overflow-y-auto py-6">
            {/* Centered, narrower reading column. Messages and composer both
                respect this width so the prompt sits in the middle of the page. */}
            <div className="mx-auto w-full max-w-3xl px-4 sm:px-6 space-y-5">
              {messages.map((m) => (
                <MessageBubble
                  key={m.id}
                  message={m}
                  onGenerateOne={handleGenerateOne}
                  onGenerateAll={(cues) => handleGenerateAll(cues)}
                  onRouteToTool={handleRouteToTool}
                  onEstimate={handleEstimate}
                  onLayerPlan={handleLayerPlan}
                  batching={batching}
                  canBatch={features.batchGeneration}
                />
              ))}
              <div ref={scrollEndRef} />
            </div>
          </div>

          {/* Composer */}
          <div className="border-t border-atlas-border-subtle bg-atlas-bg p-3 sm:p-4">
            <div className="mx-auto w-full max-w-3xl">
              {lastCues && lastCues.cues.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  <QuickAction
                    label="Generate all"
                    icon={PlayCircle}
                    onClick={() => handleGenerateAll(lastCues.cues)}
                    disabled={!features.batchGeneration || batching}
                    hint={!features.batchGeneration ? "Unavailable" : undefined}
                  />
                  <QuickAction
                      label="Estimate calls"
                    icon={Zap}
                    onClick={() => handleEstimate(lastCues.cues)}
                  />
                  {lastCues.scene && (
                    <QuickAction
                      label="Layer plan"
                      icon={Layers}
                      onClick={() => handleLayerPlan(lastCues.scene)}
                    />
                  )}
                </div>
              )}

              <div className="flex items-end gap-2 rounded-2xl border border-atlas-border bg-atlas-surface px-4 py-3 transition-colors shadow-sm">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void handleSend();
                    }
                  }}
                  rows={3}
                  placeholder="Describe a scene, ask for a sound, or paste a script excerpt…"
                  className="atlas-agent-prompt-input flex-1 resize-none bg-transparent text-sm text-atlas-text placeholder:text-atlas-text-muted focus:outline-none focus:ring-0 focus-visible:outline-none py-1.5 max-h-60 leading-relaxed"
                  style={{ WebkitTapHighlightColor: "transparent" }}
                  data-no-transition
                />
                {/* Mic button — voice input */}
                <button
                  type="button"
                  onClick={toggleListening}
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-all self-end",
                    listening
                      ? "bg-red-500 text-white animate-pulse"
                      : "bg-atlas-surface-hover text-atlas-text-muted hover:text-atlas-text hover:bg-atlas-border"
                  )}
                  title={listening ? "Stop listening" : "Voice input"}
                >
                  {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </button>
                <button
                  type="button"
                  onClick={() => void handleSend()}
                  disabled={!input.trim() || sending}
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-all self-end",
                    input.trim() && !sending
                      ? "bg-atlas-accent text-white hover:bg-atlas-accent-hover active:scale-95"
                      : "bg-atlas-surface-hover text-atlas-text-dim cursor-not-allowed"
                  )}
                >
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </button>
              </div>
              <div className="flex items-center justify-between mt-1.5 px-2">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); setSettingsOpen((v) => !v); }}
                    className={cn(
                      "flex h-7 items-center gap-1.5 rounded-md px-2 text-xs transition-colors",
                      settingsOpen
                        ? "bg-atlas-accent-muted text-atlas-accent"
                        : "text-atlas-text-muted hover:bg-atlas-surface-hover hover:text-atlas-text"
                    )}
                    title="Generation defaults"
                  >
                    <Settings2 className="h-3.5 w-3.5" />
                    <span>Settings</span>
                  </button>
                  <button
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); setHistoryOpen((v) => !v); }}
                    className={cn(
                      "flex h-7 items-center gap-1.5 rounded-md px-2 text-xs transition-colors",
                      historyOpen
                        ? "bg-atlas-accent-muted text-atlas-accent"
                        : "text-atlas-text-muted hover:bg-atlas-surface-hover hover:text-atlas-text"
                    )}
                    title={historyOpen ? "Hide history" : "Show chat history"}
                  >
                    <History className="h-3.5 w-3.5" />
                    <span>History</span>
                  </button>
                </div>
                <p className="text-xs text-atlas-text-muted">
                  Enter to send · Shift+Enter for newline
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── History rail (portal overlay) ── */}
        {historyOpen && createPortal(
          <>
            <div className="fixed inset-0 z-40 bg-black/20" onClick={() => setHistoryOpen(false)} />
            <div className="fixed top-0 right-0 bottom-0 z-50">
              <HistoryRail
                sessions={sessions}
                activeId={activeChatId}
                onPick={(id) => { switchChat(id); setHistoryOpen(false); }}
                onNew={() => { startNewChat(); setHistoryOpen(false); }}
                onDelete={deleteChat}
              />
            </div>
          </>,
          document.body
        )}

        {/* ── Settings drawer (portal overlay) ── */}
        {settingsOpen && createPortal(
          <>
            <div
              className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm transition-opacity duration-200 animate-fade-in"
              onClick={() => setSettingsOpen(false)}
            />
            <div className="fixed top-0 right-0 bottom-0 z-50 flex justify-end">
              <SettingsDrawer
                settings={settings}
                onChange={setSettings}
                onClose={() => setSettingsOpen(false)}
              />
            </div>
          </>,
          document.body
        )}
      </div>
    </div>
  );
}

// ── History rail ──────────────────────────────────────────────

interface HistoryRailProps {
  sessions: ChatSession[];
  activeId: string | null;
  onPick: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
}

function HistoryRail({ sessions, activeId, onPick, onNew, onDelete }: HistoryRailProps) {
  // Sort newest first so freshly-touched sessions surface to the top.
  const ordered = [...sessions].sort((a, b) => b.updatedAt - a.updatedAt);
  return (
    <aside className="flex w-60 h-full shrink-0 flex-col border-l border-atlas-border-subtle bg-atlas-bg shadow-lg shadow-black/10 animate-fade-in">
      <div className="px-3 py-3 border-b border-atlas-border-subtle">
        <button
          onClick={onNew}
          className="flex w-full items-center gap-2 rounded-lg border border-atlas-border bg-atlas-surface px-3 py-2 text-sm font-medium text-atlas-text hover:bg-atlas-surface-hover transition-colors"
        >
          <Plus className="h-4 w-4" />
          New chat
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5">
        {ordered.length === 0 ? (
          <p className="px-2 py-4 text-xs text-atlas-text-muted">No conversations yet.</p>
        ) : (
          ordered.map((s) => {
            const isActive = s.id === activeId;
            return (
              <div
                key={s.id}
                className={cn(
                  "group flex items-center gap-2 rounded-lg px-2 py-2 cursor-pointer transition-colors",
                  isActive
                    ? "bg-atlas-accent-muted text-atlas-accent"
                    : "text-atlas-text hover:bg-atlas-surface-hover"
                )}
                onClick={() => onPick(s.id)}
              >
                <MessageSquare className={cn("h-3.5 w-3.5 shrink-0", isActive ? "text-atlas-accent" : "text-atlas-text-muted")} />
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-medium truncate leading-tight">{s.title}</div>
                  <div className="text-[10px] text-atlas-text-muted leading-tight mt-0.5">
                    {relativeTime(s.updatedAt)} · {s.messages.length} msg
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(s.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded text-atlas-text-muted hover:bg-atlas-danger/10 hover:text-atlas-danger transition-all"
                  title="Delete chat"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}

// ── Sub-components ─────────────────────────────────────────────

interface BubbleProps {
  message: ChatMessage;
  onGenerateOne: (cue: Cue) => void;
  onGenerateAll: (cues: Cue[]) => void;
  onRouteToTool: (cue: Cue) => void;
  onEstimate: (cues: Cue[]) => void;
  onLayerPlan: (scene: string) => void;
  batching: boolean;
  canBatch: boolean;
}

function MessageBubble({ message, onGenerateOne, onGenerateAll, onRouteToTool, onEstimate, onLayerPlan, batching, canBatch }: BubbleProps) {
  const isUser = message.role === "user";
  const [speaking, setSpeaking] = useState(false);
  const speakAudioRef = useRef<HTMLAudioElement | null>(null);

  const handleSpeak = useCallback(async () => {
    // If already playing, stop
    if (speaking && speakAudioRef.current) {
      speakAudioRef.current.pause();
      speakAudioRef.current.currentTime = 0;
      setSpeaking(false);
      return;
    }
    if (!message.content.trim()) return;
    setSpeaking(true);
    try {
      const res = await fetch("/api/elevenlabs/tts-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: message.content }),
      });
      if (!res.ok) {
        setSpeaking(false);
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      speakAudioRef.current = audio;
      audio.onended = () => {
        setSpeaking(false);
        URL.revokeObjectURL(url);
      };
      audio.onpause = () => {
        if (!audio.ended) {
          setSpeaking(false);
          URL.revokeObjectURL(url);
        }
      };
      audio.onerror = () => {
        setSpeaking(false);
        URL.revokeObjectURL(url);
      };
      await audio.play();
    } catch {
      setSpeaking(false);
    }
  }, [message.content, speaking]);

  return (
    <div className={cn("group flex gap-3", isUser ? "justify-end" : "justify-start")}>
      {!isUser && (
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-atlas-accent/10 mt-0.5" title="Wilhelm">
          <Orbit className="h-3.5 w-3.5 text-atlas-accent" />
        </div>
      )}
      <div className={cn("max-w-[88%] sm:max-w-[78%] space-y-2", isUser ? "items-end" : "items-start")}>
        <div
          className={cn(
            "relative rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
            isUser
              ? "bg-atlas-accent text-white rounded-br-md ml-auto"
              : "bg-atlas-surface text-atlas-text rounded-bl-md"
          )}
        >
          {message.content.split("\n").map((line, i, arr) => (
            <span key={i}>
              {line}
              {i < arr.length - 1 && <br />}
            </span>
          ))}
          {message.tool && (
            <div className="mt-1.5 flex items-center gap-1.5 text-[11px] opacity-70">
              {message.tool.status === "pending" ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : message.tool.status === "completed" ? (
                <CheckCircle2 className="h-3 w-3" />
              ) : (
                <AlertCircle className="h-3 w-3" />
              )}
              {message.tool.name.replace(/_/g, " ")}
            </div>
          )}
          {/* Speaker button — only on assistant messages */}
          {!isUser && message.content.trim() && (
            <button
              onClick={handleSpeak}
              className={cn(
                "absolute -bottom-3 right-2 flex h-6 w-6 items-center justify-center rounded-full border border-atlas-border bg-atlas-bg shadow-sm transition-all",
                speaking
                  ? "text-atlas-accent border-atlas-accent/40"
                  : "text-atlas-text-dim opacity-0 group-hover:opacity-100 hover:text-atlas-text hover:border-atlas-border"
              )}
              title={speaking ? "Stop speaking" : "Listen"}
            >
              {speaking ? <VolumeX className="h-3 w-3" /> : <Volume2 className="h-3 w-3" />}
            </button>
          )}
        </div>

        {/* Structured renderers */}
        {message.payload?.kind === "cues" && (
          <CueList
            cues={message.payload.cues}
            scene={message.payload.scene}
            onGenerateOne={onGenerateOne}
            onGenerateAll={onGenerateAll}
            onRouteToTool={onRouteToTool}
            onEstimate={onEstimate}
            onLayerPlan={onLayerPlan}
            batching={batching}
            canBatch={canBatch}
          />
        )}
        {message.payload?.kind === "layer_plan" && (
          <LayerPlanView
            layers={message.payload.layers}
            cues={message.payload.cues}
            onGenerateOne={onGenerateOne}
            onGenerateAll={onGenerateAll}
            onRouteToTool={onRouteToTool}
            canBatch={canBatch}
            batching={batching}
          />
        )}
        {message.payload?.kind === "batch_result" && (
          <BatchResults results={message.payload.results} />
        )}
        {message.payload?.kind === "single_result" && (
          <BatchResults results={[message.payload.result]} />
        )}
        {message.payload?.kind === "estimate" && (
          <EstimateCard credits={message.payload.credits} chars={message.payload.chars} gens={message.payload.gens} />
        )}
        {message.payload?.kind === "routing" && (
          <RoutingSuggestions suggestions={message.payload.suggestions} />
        )}
      </div>
      {isUser && (
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-atlas-accent text-white mt-0.5">
          <User className="h-3.5 w-3.5" />
        </div>
      )}
    </div>
  );
}

function CueList({
  cues,
  scene,
  onGenerateOne,
  onGenerateAll,
  onRouteToTool,
  onEstimate,
  onLayerPlan,
  batching,
  canBatch,
}: {
  cues: Cue[];
  scene: string;
  onGenerateOne: (cue: Cue) => void;
  onGenerateAll: (cues: Cue[]) => void;
  onRouteToTool: (cue: Cue) => void;
  onEstimate: (cues: Cue[]) => void;
  onLayerPlan: (scene: string) => void;
  batching: boolean;
  canBatch: boolean;
}) {
  return (
    <div className="atlas-card p-3 space-y-2.5">
      <div className="flex items-center justify-between">
        <span className="atlas-eyebrow flex items-center gap-1.5">
          <ListChecks className="h-3.5 w-3.5" />
          {cues.length} cues
        </span>
        <div className="flex items-center gap-1">
          <SmallAction
            label="Estimate"
            icon={Zap}
            onClick={() => onEstimate(cues)}
          />
          {scene && (
            <SmallAction
              label="Layer plan"
              icon={Layers}
              onClick={() => onLayerPlan(scene)}
            />
          )}
          <SmallAction
            label="Generate all"
            icon={PlayCircle}
            onClick={() => onGenerateAll(cues)}
            disabled={!canBatch || batching}
            hint={!canBatch ? "Unavailable" : undefined}
            primary
          />
        </div>
      </div>
      <div className="space-y-1.5">
        {cues.map((cue) => {
          const route = CATEGORY_ROUTES[cue.category] ?? DEFAULT_ROUTE;
          const Icon = TOOL_ICONS[route.icon];
          return (
            <div
              key={cue.cue_number}
              className="group rounded-lg border border-atlas-border-subtle bg-atlas-bg/50 px-3 py-2.5 hover:border-atlas-accent/30 transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-atlas-accent-muted text-xs font-semibold text-atlas-accent tabular-nums">
                  {cue.cue_number}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-atlas-text">{cue.title}</span>
                    <span className="rounded-full bg-atlas-surface-hover px-2 py-0.5 text-[10px] uppercase tracking-wider text-atlas-text-muted">
                      {cue.category}
                    </span>
                  </div>
                  <p className="font-mono text-xs text-atlas-text-muted leading-relaxed mt-1 line-clamp-2">
                    {cue.generated_prompt}
                  </p>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => onGenerateOne(cue)}
                    className="rounded-md p-1.5 text-atlas-text-muted hover:bg-atlas-accent/10 hover:text-atlas-accent transition-colors"
                    title="Generate this sound"
                  >
                    <PlayCircle className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => onRouteToTool(cue)}
                    className="rounded-md p-1.5 text-atlas-text-muted hover:bg-atlas-surface hover:text-atlas-text transition-colors"
                    title={`Open in ${route.label}`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LayerPlanView({
  layers,
  cues,
  onGenerateOne,
  onGenerateAll,
  onRouteToTool,
  canBatch,
  batching,
}: {
  layers: { role: string; description: string }[];
  cues: Cue[];
  onGenerateOne: (cue: Cue) => void;
  onGenerateAll: (cues: Cue[]) => void;
  onRouteToTool: (cue: Cue) => void;
  canBatch: boolean;
  batching: boolean;
}) {
  return (
    <div className="atlas-card p-3 space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {layers.map((l) => (
          <div key={l.role} className="rounded-lg border border-atlas-border-subtle bg-atlas-bg/50 px-3 py-2">
            <span className="block text-xs font-semibold uppercase tracking-wider text-atlas-accent">
              {l.role}
            </span>
            <span className="text-xs text-atlas-text-muted leading-snug">{l.description}</span>
          </div>
        ))}
      </div>
      {cues.length > 0 && (
        <CueList
          cues={cues}
          scene=""
          onGenerateOne={onGenerateOne}
          onGenerateAll={onGenerateAll}
          onRouteToTool={onRouteToTool}
          onEstimate={() => {}}
          onLayerPlan={() => {}}
          batching={batching}
          canBatch={canBatch}
        />
      )}
    </div>
  );
}

function BatchResults({ results }: { results: BatchResult[] }) {
  return (
    <div className="atlas-card p-3 space-y-1.5">
      {results.map((r, i) => (
        <div key={i} className="flex items-center gap-3 px-2 py-1.5 rounded-lg bg-atlas-bg/40">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center">
            {r.status === "pending" ? (
              <Loader2 className="h-3 w-3 animate-spin text-atlas-text-muted" />
            ) : r.status === "succeeded" ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-atlas-success" />
            ) : (
              <AlertCircle className="h-3.5 w-3.5 text-atlas-danger" />
            )}
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-sm text-atlas-text truncate">{r.cue.title}</div>
            <div className="text-xs text-atlas-text-muted truncate">
              {r.status === "failed" ? r.error : r.cue.category}
            </div>
          </div>
          {r.audioUrl && (
            <button
              onClick={() => {
                window.dispatchEvent(new CustomEvent("atlas:audio:play", {
                  detail: {
                    id: r.generationId ?? r.cue.title,
                    url: r.audioUrl,
                    title: buildAutoName({ prompt: r.cue.generated_prompt, category: "sfx" }).displayName,
                    filename: autoFilename({ prompt: r.cue.generated_prompt, category: "sfx" }, "mp3"),
                    prompt: r.cue.generated_prompt,
                    category: r.cue.category,
                    duration: r.cue.duration_seconds ?? null,
                    createdAt: Date.now(),
                  },
                }));
              }}
              className="rounded-md p-1.5 text-atlas-text-muted hover:bg-atlas-accent/10 hover:text-atlas-accent transition-colors"
              title="Play"
            >
              <PlayCircle className="h-4 w-4" />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

function EstimateCard({ credits, chars, gens }: { credits: number; chars: number; gens: number }) {
  return (
    <div className="atlas-card p-4 grid grid-cols-3 gap-3 text-center">
      <div>
        <div className="text-xl font-bold text-atlas-accent tabular-nums">{credits}</div>
        <div className="atlas-eyebrow mt-1">Provider Calls</div>
      </div>
      <div>
        <div className="text-xl font-bold text-atlas-text tabular-nums">{gens}</div>
        <div className="atlas-eyebrow mt-1">Sounds</div>
      </div>
      <div>
        <div className="text-xl font-bold text-atlas-text tabular-nums">{chars.toLocaleString()}</div>
        <div className="atlas-eyebrow mt-1">Characters</div>
      </div>
    </div>
  );
}

function RoutingSuggestions({ suggestions }: { suggestions: ToolRouting[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {suggestions.map((s) => {
        const Icon = TOOL_ICONS[s.icon];
        return (
          <Link
            key={`${s.label}-${s.href}`}
            href={s.href}
            className="atlas-card atlas-card-interactive p-3 flex items-center gap-3 group"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-atlas-accent-muted shrink-0">
              <Icon className="h-4 w-4 text-atlas-accent" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-atlas-text group-hover:text-atlas-accent transition-colors">
                {s.label}
              </span>
              <span className="text-xs text-atlas-text-muted truncate block">{s.description}</span>
            </div>
            <ChevronRight className="h-4 w-4 text-atlas-text-muted group-hover:text-atlas-accent group-hover:translate-x-0.5 transition-all" />
          </Link>
        );
      })}
    </div>
  );
}

function SmallAction({
  label,
  icon: Icon,
  onClick,
  disabled,
  hint,
  primary,
}: {
  label: string;
  icon: typeof Zap;
  onClick: () => void;
  disabled?: boolean;
  hint?: string;
  primary?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={hint}
      className={cn(
        "flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors",
        disabled && "opacity-40 cursor-not-allowed",
        !disabled && primary && "bg-atlas-accent text-white hover:bg-atlas-accent-hover",
        !disabled && !primary && "text-atlas-text-muted hover:bg-atlas-surface-hover hover:text-atlas-text"
      )}
    >
      <Icon className="h-3 w-3" />
      {label}
    </button>
  );
}

function QuickAction({
  label,
  icon: Icon,
  onClick,
  disabled,
  hint,
}: {
  label: string;
  icon: typeof Zap;
  onClick: () => void;
  disabled?: boolean;
  hint?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={hint}
      className={cn(
        "flex items-center gap-1.5 rounded-full border border-atlas-border-subtle px-3 py-1.5 text-xs font-medium transition-colors",
        disabled
          ? "opacity-40 cursor-not-allowed"
          : "text-atlas-text-muted hover:border-atlas-accent/40 hover:text-atlas-accent hover:bg-atlas-accent-muted/30"
      )}
    >
      <Icon className="h-3 w-3" />
      {label}
    </button>
  );
}

// ── Format options for the card grid ──
const DRAWER_FORMATS = [
  { value: "mp3_44100_128", label: "MP3", sampleRate: "44.1kHz", detail: "128kbps", type: "mp3" as const },
  { value: "mp3_44100_192", label: "MP3", sampleRate: "44.1kHz", detail: "192kbps", type: "mp3" as const },
  { value: "pcm_44100", label: "PCM", sampleRate: "44.1kHz", detail: "RAW", type: "pcm" as const },
  { value: "pcm_48000", label: "PCM", sampleRate: "48kHz", detail: "RAW", type: "pcm" as const },
];

function SettingsDrawer({
  settings,
  onChange,
  onClose,
}: {
  settings: GenerationSettings;
  onChange: (s: GenerationSettings) => void;
  onClose: () => void;
}) {
  const [newExclusion, setNewExclusion] = useState("");

  // Slider helpers — custom styled range
  const durationPct = ((settings.durationSeconds - 0.5) / (30 - 0.5)) * 100;
  const influencePct = (settings.promptInfluence / 1) * 100;

  return (
    <aside
      className="w-full max-w-[380px] h-full shrink-0 overflow-y-auto atlas-card rounded-l-2xl rounded-r-none border-r-0 shadow-2xl shadow-black/20"
      style={{
        animation: "settingsSlideIn 280ms cubic-bezier(0.16, 1, 0.3, 1) forwards",
      }}
    >
      {/* Slide-in keyframes (injected inline) */}
      <style>{`
        @keyframes settingsSlideIn {
          from { transform: translateX(100%); opacity: 0.5; }
          to   { transform: translateX(0);    opacity: 1; }
        }
      `}</style>

      {/* ── Header ── */}
      <div className="sticky top-0 z-10 flex items-center gap-3 px-5 py-4 border-b border-atlas-border-subtle bg-atlas-bg/80 backdrop-blur-md">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-atlas-accent-muted shrink-0">
          <Settings2 className="h-4 w-4 text-atlas-accent" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-atlas-text leading-tight">Generation Settings</h3>
          <p className="text-[11px] text-atlas-text-muted leading-tight mt-0.5">Defaults for all sounds</p>
        </div>
        <button
          onClick={onClose}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-atlas-text-dim hover:bg-atlas-surface-hover hover:text-atlas-text transition-colors"
          aria-label="Close settings"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="p-5 space-y-6">
        {/* ═══════════════════════ AUDIO SECTION ═══════════════════════ */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="h-px flex-1 bg-atlas-border-subtle" />
            <span className="text-[10px] font-semibold uppercase tracking-widest text-atlas-text-dim">Audio</span>
            <div className="h-px flex-1 bg-atlas-border-subtle" />
          </div>

          {/* Duration — styled slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-atlas-text-muted">Duration</label>
              <span className="text-xs font-mono font-medium text-atlas-accent tabular-nums">{settings.durationSeconds}s</span>
            </div>
            <div className="relative h-8 cursor-pointer select-none group">
              <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-1.5 rounded-full bg-atlas-surface-hover ring-1 ring-atlas-border-subtle/50" />
              <div
                className="absolute top-1/2 -translate-y-1/2 left-0 h-1.5 rounded-full"
                style={{
                  width: `${durationPct}%`,
                  background: "linear-gradient(90deg, var(--color-atlas-accent) 0%, var(--color-atlas-accent-hover) 100%)",
                }}
              />
              <input
                type="range"
                min={0.5}
                max={30}
                step={0.5}
                value={settings.durationSeconds}
                onChange={(e) => onChange({ ...settings, durationSeconds: Number(e.target.value) })}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-4 w-4 rounded-full bg-atlas-accent border-2 border-atlas-bg transition-shadow group-hover:shadow-[0_0_10px_rgba(99,102,241,0.5)]"
                style={{ left: `${durationPct}%`, pointerEvents: "none" }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-atlas-text-dim">
              <span>0.5s</span>
              <span>30s</span>
            </div>
          </div>

          {/* Prompt Influence — styled slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-atlas-text-muted">Prompt Influence</label>
              <span className="text-xs font-mono font-medium text-atlas-accent tabular-nums">{settings.promptInfluence.toFixed(2)}</span>
            </div>
            <div className="relative h-8 cursor-pointer select-none group">
              <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-1.5 rounded-full bg-atlas-surface-hover ring-1 ring-atlas-border-subtle/50" />
              <div
                className="absolute top-1/2 -translate-y-1/2 left-0 h-1.5 rounded-full"
                style={{
                  width: `${influencePct}%`,
                  background: "linear-gradient(90deg, var(--color-atlas-accent) 0%, var(--color-atlas-accent-hover) 100%)",
                }}
              />
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={settings.promptInfluence}
                onChange={(e) => onChange({ ...settings, promptInfluence: Number(e.target.value) })}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-4 w-4 rounded-full bg-atlas-accent border-2 border-atlas-bg transition-shadow group-hover:shadow-[0_0_10px_rgba(99,102,241,0.5)]"
                style={{ left: `${influencePct}%`, pointerEvents: "none" }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-atlas-text-dim">
              <span>Creative</span>
              <span>Precise</span>
            </div>
          </div>

          {/* Loop toggle — h-6 w-11 pattern */}
          <label className="flex items-center justify-between cursor-pointer group py-1">
            <span className="flex items-center gap-2.5 text-sm text-atlas-text">
              <Repeat className={cn("h-4 w-4 transition-colors", settings.loop ? "text-atlas-accent" : "text-atlas-text-muted")} />
              Seamless loop
            </span>
            <div
              onClick={() => onChange({ ...settings, loop: !settings.loop })}
              className={cn(
                "relative h-6 w-11 rounded-full transition-colors duration-200 cursor-pointer",
                settings.loop ? "bg-atlas-accent" : "bg-atlas-surface-hover border border-atlas-border"
              )}
            >
              <div
                className={cn(
                  "absolute top-0.5 h-5 w-5 rounded-full shadow-sm transition-transform duration-200",
                  settings.loop ? "translate-x-5 bg-white" : "translate-x-0.5 bg-atlas-text-dim"
                )}
              />
            </div>
          </label>
        </div>

        {/* ═══════════════════════ OUTPUT SECTION ═══════════════════════ */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="h-px flex-1 bg-atlas-border-subtle" />
            <span className="text-[10px] font-semibold uppercase tracking-widest text-atlas-text-dim">Output</span>
            <div className="h-px flex-1 bg-atlas-border-subtle" />
          </div>

          {/* Model — styled card selector */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-atlas-text-muted block">ElevenLabs Engine</label>
            <button
              className={cn(
                "w-full flex items-center gap-3 rounded-xl p-3 transition-all duration-200",
                "atlas-card bg-atlas-accent-muted/30 ring-1 ring-atlas-accent/20 hover:ring-atlas-accent/40"
              )}
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-atlas-accent-muted shrink-0">
                <AudioWaveform className="h-4 w-4 text-atlas-accent" />
              </div>
              <div className="min-w-0 flex-1 text-left">
                <span className="text-sm font-semibold text-atlas-text block">Sound Effects v2</span>
                <span className="text-[11px] text-atlas-text-muted">text-to-sound</span>
              </div>
              <span className="rounded-full bg-atlas-success/10 px-2 py-0.5 text-[10px] font-semibold text-atlas-success shrink-0">
                Active
              </span>
            </button>
            {/* Hidden select preserves state binding */}
            <select
              value={settings.modelId}
              onChange={(e) => onChange({ ...settings, modelId: e.target.value })}
              className="sr-only"
              tabIndex={-1}
            >
              <option value="eleven_text_to_sound_v2">Sound Effects v2 (text-to-sound)</option>
            </select>
            <p className="text-[11px] text-atlas-text-muted flex items-center gap-1.5 px-1">
              <Lightbulb className="h-3 w-3 shrink-0" />
              For TTS, dialogue, or music head to the dedicated labs.
            </p>
          </div>

          {/* Output format — card grid selector (FormatSelector pattern) */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-atlas-text-muted block">Output Format</label>
            <div className="grid grid-cols-2 gap-1.5">
              {DRAWER_FORMATS.map((fmt) => {
                const isActive = settings.outputFormat === fmt.value;
                const FmtIcon = fmt.type === "mp3" ? AudioWaveform : Cpu;
                return (
                  <button
                    key={fmt.value}
                    onClick={() => onChange({ ...settings, outputFormat: fmt.value })}
                    className={cn(
                      "group relative flex flex-col items-center rounded-xl px-2 py-3 text-center transition-all duration-200",
                      isActive
                        ? "atlas-card bg-atlas-accent-muted ring-1 ring-atlas-accent/30 shadow-sm"
                        : "atlas-card hover:border-atlas-border"
                    )}
                  >
                    <FmtIcon className={cn(
                      "h-4 w-4 mb-1.5 transition-colors",
                      isActive ? "text-atlas-accent" : "text-atlas-text-dim group-hover:text-atlas-text-muted"
                    )} />
                    <span className={cn(
                      "text-xs font-semibold",
                      isActive ? "text-atlas-accent" : "text-atlas-text-muted"
                    )}>
                      {fmt.sampleRate}
                    </span>
                    <span className={cn(
                      "text-[10px]",
                      isActive ? "text-atlas-accent/70" : "text-atlas-text-dim"
                    )}>
                      {fmt.label} · {fmt.detail}
                    </span>
                    {isActive && (
                      <div className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-atlas-accent flex items-center justify-center animate-scale-in">
                        <svg className="h-2 w-2 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ═══════════════════════ SAFETY SECTION ═══════════════════════ */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="h-px flex-1 bg-atlas-border-subtle" />
            <span className="text-[10px] font-semibold uppercase tracking-widest text-atlas-text-dim">Safety</span>
            <div className="h-px flex-1 bg-atlas-border-subtle" />
          </div>

          {/* Exclusions */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-atlas-text-muted block">Exclusion Constraints</label>
            <div className="flex flex-wrap gap-1.5">
              {settings.exclusions.map((e) => (
                <span
                  key={e}
                  className="flex items-center gap-1 rounded-full bg-atlas-surface-hover px-2.5 py-1 text-xs text-atlas-text-muted group/tag hover:bg-atlas-danger/10 transition-colors"
                >
                  {e}
                  <button
                    onClick={() =>
                      onChange({ ...settings, exclusions: settings.exclusions.filter((x) => x !== e) })
                    }
                    className="text-atlas-text-dim group-hover/tag:text-atlas-danger transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-1.5">
              <input
                value={newExclusion}
                onChange={(e) => setNewExclusion(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const v = newExclusion.trim().toLowerCase();
                    if (v && !settings.exclusions.includes(v)) {
                      onChange({ ...settings, exclusions: [...settings.exclusions, v] });
                    }
                    setNewExclusion("");
                  }
                }}
                placeholder="add constraint…"
                className="flex-1 rounded-lg border border-atlas-border bg-atlas-surface px-3 py-2 text-xs text-atlas-text placeholder:text-atlas-text-muted focus:border-atlas-accent focus:outline-none transition-colors"
                data-no-transition
              />
              <button
                onClick={() => {
                  const v = newExclusion.trim().toLowerCase();
                  if (v && !settings.exclusions.includes(v)) {
                    onChange({ ...settings, exclusions: [...settings.exclusions, v] });
                  }
                  setNewExclusion("");
                }}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-atlas-surface-hover text-atlas-text-muted hover:bg-atlas-accent-muted hover:text-atlas-accent transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* ── Footer actions ── */}
        <div className="space-y-3 pt-2">
          <div className="border-t border-atlas-border-subtle pt-3">
            <button
              onClick={() => onChange(DEFAULT_SETTINGS)}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-atlas-text-muted hover:bg-atlas-surface-hover hover:text-atlas-text transition-colors w-full"
            >
              <RefreshCcw className="h-3.5 w-3.5" />
              Reset to defaults
            </button>
          </div>

          <div className="rounded-xl bg-atlas-surface-hover/50 px-4 py-3 text-[11px] text-atlas-text-muted leading-relaxed">
            <span className="font-semibold text-atlas-text-muted flex items-center gap-1.5 mb-1">
              <Clock className="h-3 w-3" />
              Tip
            </span>
            Wilhelm picks sensible per-cue settings when planning; these defaults
            apply when you bypass that — e.g. a one-off &ldquo;generate this&rdquo; message.
          </div>
        </div>
      </div>
    </aside>
  );
}

function FreeTierGate() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center animate-fade-in">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-atlas-accent-muted mb-5">
        <Sparkles className="h-7 w-7 text-atlas-accent" />
      </div>
      <h1 className="atlas-title-lg mb-2">ChatSFX needs a local session</h1>
      <p className="text-sm text-atlas-text-muted max-w-md mb-6 leading-relaxed">
        ChatSFX is the dedicated workspace for Wilhelm, your AI sound supervisor.
        Brief whole scenes, batch-generate cues, and route into specialised
        labs from one local research workspace.
      </p>
      <div className="flex gap-2">
        <Link
          href="/dashboard/settings?tab=providers"
          className="rounded-lg bg-atlas-accent text-white px-4 py-2.5 text-sm font-semibold hover:bg-atlas-accent-hover transition-colors flex items-center gap-2"
        >
          Provider settings <ExternalLink className="h-3.5 w-3.5" />
        </Link>
        <Link
          href="/dashboard/generate"
          className="rounded-lg border border-atlas-border bg-atlas-surface px-4 py-2.5 text-sm font-semibold text-atlas-text hover:border-atlas-accent transition-colors"
        >
          Use the basic generator
        </Link>
      </div>
    </div>
  );
}

// ── Logic helpers ───────────────────────────────────────────

function suggestRouting(cues: Cue[]): ToolRouting[] {
  const map = new Map<string, ToolRouting>();
  for (const cue of cues) {
    const route = CATEGORY_ROUTES[cue.category];
    if (route) map.set(route.href, route);
  }
  return Array.from(map.values()).slice(0, 4);
}
