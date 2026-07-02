"use client";

/**
 * Floating Composer — global prompt box.
 *
 * Lives at the bottom-right of the dashboard (just above the player) and
 * gives the user a persistent textarea + Generate button + Send-to-tool
 * menu wherever they are in the app. Generation pages can call
 * `useRegisterComposer()` to push their current prompt into the box and
 * register a custom Generate handler; if no page registers, the widget
 * falls back to navigating to `/dashboard/generate?text=…`.
 *
 * State is mirrored to localStorage so the prompt survives navigation
 * and reloads.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  ChevronUp,
  ChevronDown,
  Loader2,
  Send,
  Sparkles,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ROUTE_DESTINATIONS } from "@/lib/sfx/route-to-tool";

const STORAGE_KEY = "atlas-floating-composer-v1";

// Disabled — generation pages now use integrated sticky sidebars.
const ENABLED_PREFIXES: string[] = [];

interface ComposerState {
  prompt: string;
  category: string | null;
  /** Updated by registered page when its own generate is running. */
  generating: boolean;
}

interface ComposerContextValue extends ComposerState {
  setPrompt: (next: string) => void;
  setCategory: (next: string | null) => void;
  setGenerating: (v: boolean) => void;
  /** Called by the widget's Generate button. */
  triggerGenerate: () => void;
  /** Register a custom handler for Generate (returns unregister). */
  registerGenerate: (fn: (() => void | Promise<void>) | null) => void;
}

const ComposerContext = createContext<ComposerContextValue | null>(null);

export function useFloatingComposer(): ComposerContextValue {
  const ctx = useContext(ComposerContext);
  if (!ctx) {
    return {
      prompt: "",
      category: null,
      generating: false,
      setPrompt: () => {},
      setCategory: () => {},
      setGenerating: () => {},
      triggerGenerate: () => {},
      registerGenerate: () => {},
    };
  }
  return ctx;
}

/**
 * Convenience hook for generation pages: keeps the composer's prompt
 * synced both ways with the page's local state and registers a Generate
 * callback. When the user edits the prompt inside the floating widget,
 * the page's setPrompt is invoked; when the page updates the prompt
 * locally, the floating widget reflects the change.
 *
 * The bidirectional sync uses a "last seen" ref to break the loop —
 * we only forward an update if the incoming value differs from the
 * one we last propagated.
 */
export function useRegisterComposer(opts: {
  prompt: string;
  setPrompt?: (next: string) => void;
  category?: string | null;
  onGenerate?: (() => void | Promise<void>) | null;
  generating?: boolean;
}) {
  const composer = useFloatingComposer();
  const { prompt, setPrompt, category = null, onGenerate, generating } = opts;

  const lastPromptRef = useRef<string>(prompt);

  // Page → composer
  useEffect(() => {
    if (prompt !== lastPromptRef.current) {
      lastPromptRef.current = prompt;
      composer.setPrompt(prompt);
    }
  }, [prompt, composer]);

  // Composer → page
  useEffect(() => {
    if (!setPrompt) return;
    if (composer.prompt !== lastPromptRef.current) {
      lastPromptRef.current = composer.prompt;
      setPrompt(composer.prompt);
    }
  }, [composer.prompt, setPrompt]);

  useEffect(() => {
    composer.setCategory(category);
  }, [category, composer]);

  useEffect(() => {
    if (typeof generating === "boolean") composer.setGenerating(generating);
  }, [generating, composer]);

  // Register the page's generate handler, and clean up on unmount.
  useEffect(() => {
    composer.registerGenerate(onGenerate ?? null);
    return () => {
      composer.registerGenerate(null);
    };
  }, [onGenerate, composer]);
}

function loadStored(): Partial<ComposerState> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function saveStored(state: Pick<ComposerState, "prompt" | "category">) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // noop
  }
}

export function FloatingComposerProvider({ children }: { children: ReactNode }) {
  const [prompt, setPromptState] = useState("");
  const [category, setCategoryState] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  // The registered generate handler — pages push a function here; the
  // widget calls it. Use a ref so registering doesn't re-render every
  // consumer of the context.
  const handlerRef = useRef<(() => void | Promise<void>) | null>(null);

  const router = useRouter();

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const stored = loadStored();
    if (typeof stored.prompt === "string") setPromptState(stored.prompt);
    if (typeof stored.category === "string" || stored.category === null) {
      setCategoryState(stored.category ?? null);
    }
    setHydrated(true);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (!hydrated) return;
    saveStored({ prompt, category });
  }, [prompt, category, hydrated]);

  const setPrompt = useCallback((next: string) => setPromptState(next), []);
  const setCategory = useCallback((next: string | null) => setCategoryState(next), []);
  const registerGenerate = useCallback((fn: (() => void | Promise<void>) | null) => {
    handlerRef.current = fn;
  }, []);

  const triggerGenerate = useCallback(() => {
    const fn = handlerRef.current;
    if (fn) {
      void fn();
      return;
    }
    // Fallback: navigate to the generic generator with the current prompt.
    const params = new URLSearchParams();
    if (prompt) params.set("text", prompt);
    if (category) params.set("category", category);
    router.push(`/dashboard/generate?${params.toString()}`);
  }, [prompt, category, router]);

  const value = useMemo<ComposerContextValue>(
    () => ({
      prompt,
      category,
      generating,
      setPrompt,
      setCategory,
      setGenerating,
      triggerGenerate,
      registerGenerate,
    }),
    [prompt, category, generating, setPrompt, setCategory, triggerGenerate, registerGenerate]
  );

  return <ComposerContext.Provider value={value}>{children}</ComposerContext.Provider>;
}

export function FloatingComposerWidget() {
  const composer = useFloatingComposer();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(true);
  const [sendMenuOpen, setSendMenuOpen] = useState(false);
  const sendRef = useRef<HTMLDivElement>(null);

  // Close the send-to menu on outside click.
  useEffect(() => {
    if (!sendMenuOpen) return;
    const handler = (e: MouseEvent) => {
      if (sendRef.current && !sendRef.current.contains(e.target as Node)) {
        setSendMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [sendMenuOpen]);

  // Only show on generation-relevant pages so the widget doesn't pollute
  // settings / library / about / etc.
  const enabled = useMemo(
    () => ENABLED_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/")),
    [pathname]
  );

  if (!enabled) return null;

  const handleSendTo = (path: string) => {
    setSendMenuOpen(false);
    const params = new URLSearchParams();
    if (composer.prompt) params.set("text", composer.prompt);
    if (composer.category) params.set("category", composer.category);
    const sep = path.includes("?") ? "&" : "?";
    router.push(`${path}${sep}${params.toString()}`);
  };

  const canGenerate = composer.prompt.trim().length > 0 && !composer.generating;

  return (
    <div
      className={cn(
        // Anchored to the right edge, sitting above the global player bar
        // (which lives at z-40, bottom-0). We use z-30 so the player still
        // floats on top of us, never the other way around.
        "fixed z-30 right-4 bottom-[84px] w-[360px] max-w-[calc(100vw-2rem)]",
        "rounded-2xl border border-atlas-border bg-atlas-surface shadow-xl shadow-black/20",
        "animate-fade-in"
      )}
    >
      {/* Header / collapse handle */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-3 py-2 text-xs text-atlas-text-muted hover:text-atlas-text"
        aria-label={open ? "Collapse composer" : "Expand composer"}
      >
        <span className="flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5" />
          <span className="font-semibold text-atlas-text">Prompt</span>
          {composer.category && (
            <span className="ml-1 rounded-full bg-atlas-surface-hover px-1.5 py-0.5 text-[10px] text-atlas-text-muted">
              {composer.category}
            </span>
          )}
        </span>
        {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
      </button>

      {open && (
        <div className="border-t border-atlas-border-subtle p-3 space-y-2">
          <textarea
            value={composer.prompt}
            onChange={(e) => composer.setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                e.preventDefault();
                if (canGenerate) composer.triggerGenerate();
              }
            }}
            placeholder="Describe the sound you want…"
            rows={3}
            className="w-full resize-y rounded-lg border border-atlas-border bg-atlas-bg px-3 py-2 text-sm text-atlas-text placeholder-atlas-text-dim focus:border-atlas-accent focus:outline-none max-h-40 leading-relaxed"
          />

          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1 text-[10px] text-atlas-text-muted">
              {composer.prompt.trim() && (
                <button
                  onClick={() => composer.setPrompt("")}
                  className="rounded p-1 text-atlas-text-dim hover:bg-atlas-surface-hover hover:text-atlas-text"
                  title="Clear prompt"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
              <span className="tabular-nums">{composer.prompt.length} chars</span>
            </div>

            <div className="flex items-center gap-1.5">
              <div ref={sendRef} className="relative">
                <button
                  onClick={() => setSendMenuOpen((v) => !v)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-atlas-border bg-atlas-surface px-2.5 py-1.5 text-xs text-atlas-text-muted hover:border-atlas-text-dim hover:text-atlas-text transition-colors"
                  title="Send prompt to a different tool"
                >
                  <Send className="h-3 w-3" />
                  Send to
                </button>
                {sendMenuOpen && (
                  <div className="absolute right-0 bottom-full mb-2 z-50 w-64 max-h-72 overflow-y-auto rounded-xl border border-atlas-border bg-atlas-surface shadow-lg shadow-black/20 py-1 animate-fade-in">
                    <div className="px-3 py-1.5 border-b border-atlas-border-subtle">
                      <span className="text-[11px] font-medium uppercase tracking-wider text-atlas-text-dim">
                        Open prompt in
                      </span>
                    </div>
                    {ROUTE_DESTINATIONS.filter((r) =>
                      // Hide destinations that need a generationId we don't have
                      // — they're only useful for routing existing sounds.
                      !["review", "project", "daw_pack", "game_manifest", "export_center"].includes(r.id)
                    ).map((route) => (
                      <button
                        key={route.id}
                        onClick={() => handleSendTo(route.path)}
                        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-atlas-surface-hover transition-colors group"
                      >
                        <span className="text-sm shrink-0">{route.icon}</span>
                        <div className="flex-1 min-w-0">
                          <span className="block text-xs font-medium text-atlas-text group-hover:text-atlas-accent transition-colors">
                            {route.label}
                          </span>
                          <span className="block text-[11px] text-atlas-text-dim truncate">
                            {route.description}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button
                onClick={composer.triggerGenerate}
                disabled={!canGenerate}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                  canGenerate
                    ? "bg-atlas-accent text-white hover:bg-atlas-accent-hover"
                    : "bg-atlas-surface-hover text-atlas-text-dim cursor-not-allowed"
                )}
                title="⌘+Enter"
              >
                {composer.generating ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5" />
                )}
                Generate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
