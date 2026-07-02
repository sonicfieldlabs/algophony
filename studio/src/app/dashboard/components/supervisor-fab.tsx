"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";
import {
  Orbit,
  Send,
  X,
  Zap,
  CheckCircle2,
  Sparkles,
  ListChecks,
  Layers,
  FileText,
  DollarSign,
  BarChart3,
  Clock,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChatMessage, SupervisorAction } from "@/lib/supervisor/types";
import { classifyIntent, OUT_OF_SCOPE_RESPONSE } from "@/lib/supervisor/intent-router";

interface SupervisorFabProps {
  plan: string;
  creditsRemaining: number;
}

export function SupervisorFab({ plan, creditsRemaining }: SupervisorFabProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [pendingActions, setPendingActions] = useState<SupervisorAction[]>([]);
  const [hasUnread, setHasUnread] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Start session
  const startSession = useCallback(async () => {
    try {
      const res = await fetch("/api/supervisor/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "quick", page_context: pathname }),
      });
      const data = await res.json();
      if (data.session) {
        setSessionId(data.session.id);
        setMessages([{
          id: "welcome",
          role: "assistant",
          content: "Hey — I'm Wilhelm, your sound supervisor. Describe a scene or sound and I'll break it down into production-ready cues.",
          timestamp: Date.now(),
        }]);
      }
    } catch { /* silent */ }
  }, [pathname]);

  const handleOpen = () => {
    setIsOpen(true);
    setHasUnread(false);
    if (!sessionId) void startSession();
  };

  // Send message
  const sendMessage = useCallback(async () => {
    if (!input.trim() || !sessionId) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: input.trim(),
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMsg]);
    const currentInput = input.trim();
    setInput("");
    setIsTyping(true);
    setShowQuickActions(false);

    try {
      // §5.10: Route to correct tool based on intent classification
      const intent = classifyIntent(currentInput);

      if (intent.intent === "out_of_scope") {
        setMessages((prev) => [...prev, {
          id: `assistant-${Date.now()}`,
          role: "assistant" as const,
          content: OUT_OF_SCOPE_RESPONSE,
          timestamp: Date.now(),
        }]);
        setIsTyping(false);
        return;
      }

      const toolRoute = intent.intent === "chat"
        ? "/api/supervisor/tools/create_sound_cue_list"
        : `/api/supervisor/tools/${intent.intent}`;

      const res = await fetch(toolRoute, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          scene_description: currentInput,
          ...intent.extractedParams,
        }),
      });
      const result = await res.json();

      if (result.success && result.data) {
        const cues = result.data.cues ?? [];
        const lines = cues
          .map((c: { cue_number: number; title: string; category: string }) =>
            `${c.cue_number}. ${c.title} — ${c.category}`
          )
          .join("\n");

        const reply: ChatMessage = {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: `${cues.length} cues identified:\n\n${lines}\n\nWant me to create prompt cards for these?`,
          timestamp: Date.now(),
          toolCall: { toolName: "create_sound_cue_list", status: "completed" },
        };
        setMessages((prev) => [...prev, reply]);
        if (!isOpen) setHasUnread(true);
      } else {
        setMessages((prev) => [...prev, {
          id: `err-${Date.now()}`,
          role: "assistant" as const,
          content: result.error ?? "Couldn't process that. Try rephrasing your scene description.",
          timestamp: Date.now(),
        }]);
      }
    } catch {
      setMessages((prev) => [...prev, {
        id: `err-${Date.now()}`,
        role: "assistant" as const,
        content: "Connection issue. Try again.",
        timestamp: Date.now(),
      }]);
    } finally {
      setIsTyping(false);
    }
  }, [input, sessionId, isOpen]);

  // Quick action prefill
  const prefill = (text: string) => {
    setInput(text);
    setShowQuickActions(false);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  // Approve / reject
  const handleApprove = async (actionId: string) => {
    try {
      await fetch(`/api/supervisor/actions/${actionId}/approve`, { method: "POST" });
      setPendingActions((prev) => prev.filter((a) => a.id !== actionId));
    } catch { /* silent */ }
  };

  const handleReject = async (actionId: string) => {
    try {
      await fetch(`/api/supervisor/actions/${actionId}/reject`, { method: "POST" });
      setPendingActions((prev) => prev.filter((a) => a.id !== actionId));
    } catch { /* silent */ }
  };

  const QUICK_ACTIONS = [
    { icon: ListChecks, label: "Break down scene", prompt: "Break down this scene into sound cues: " },
    { icon: Layers, label: "Create layer plan", prompt: "Create a layered sound plan for: " },
    { icon: FileText, label: "Create prompt cards", prompt: "Create prompt cards for: " },
    { icon: DollarSign, label: "Estimate calls", prompt: "Estimate the provider calls for my current project" },
    { icon: BarChart3, label: "Usage summary", prompt: "Show my usage summary" },
  ];

  // Compatibility fallback; local workspaces should normally have full access.
  if (plan === "free") {
    return (
      <>
        {/* Dormant blob — shows local access tooltip */}
        <div className="fixed bottom-20 right-5 z-40 group">
          <div className="relative flex h-11 w-11 items-center justify-center rounded-full bg-atlas-surface border border-atlas-border-subtle cursor-default opacity-50">
            <Orbit className="h-4.5 w-4.5 text-atlas-text-dim" />
          </div>
          <div className="absolute bottom-full right-0 mb-2 hidden group-hover:block">
            <div className="rounded-lg bg-atlas-surface border border-atlas-border px-3 py-2 text-xs text-atlas-text-muted shadow-lg whitespace-nowrap">
              Configure a local workspace to use Wilhelm
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      {/* ── Floating Blob ── */}
      {!isOpen && (
        <button
          onClick={handleOpen}
          className="fixed bottom-20 right-5 z-40 group"
        >
          <div className="relative flex h-11 w-11 items-center justify-center rounded-full bg-atlas-bg border border-atlas-border-subtle shadow-md shadow-black/10 transition-all duration-300 group-hover:shadow-lg group-hover:shadow-atlas-accent/10 group-hover:border-atlas-accent/30 group-active:scale-95">
            <Orbit className="h-[18px] w-[18px] text-atlas-text-muted transition-colors group-hover:text-atlas-accent" />
            {/* Unread dot */}
            {hasUnread && (
              <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-atlas-accent opacity-50" />
                <span className="relative inline-flex h-3 w-3 rounded-full bg-atlas-accent" />
              </span>
            )}
          </div>
        </button>
      )}

      {/* ── Chat Panel ── */}
      {isOpen && (
        <div
          className={cn(
            "fixed bottom-20 right-5 z-50 flex flex-col",
            "w-[380px] rounded-2xl",
            "bg-atlas-bg border border-atlas-border-subtle",
            "shadow-2xl shadow-black/25",
            "animate-in fade-in slide-in-from-bottom-3 duration-200",
          )}
          style={{ maxHeight: "min(600px, calc(100vh - 100px))" }}
        >
          {/* ── Header ── */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-atlas-border-subtle">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-atlas-accent/20 to-atlas-accent/5">
                <Orbit className="h-3.5 w-3.5 text-atlas-accent" />
              </div>
              <div className="leading-none">
                <span className="text-[13px] font-medium text-atlas-text">Wilhelm</span>
                <span className="flex items-center gap-1 text-xs text-atlas-text-dim mt-0.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
                  Agent
                </span>
              </div>
            </div>
            <div className="flex items-center gap-0.5">
              <span className="flex items-center gap-1 text-xs text-atlas-text-dim mr-2">
                <Zap className="h-3 w-3 text-atlas-accent/60" />
                {creditsRemaining}
              </span>
              <button
                onClick={() => setIsOpen(false)}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-atlas-text-dim hover:bg-atlas-surface-hover hover:text-atlas-text transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* ── Messages ── */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3" style={{ minHeight: "240px" }}>
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn("flex gap-2", msg.role === "user" ? "justify-end" : "justify-start")}
              >
                {msg.role === "assistant" && (
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-atlas-accent/10 mt-0.5">
                    <Orbit className="h-2.5 w-2.5 text-atlas-accent" />
                  </div>
                )}
                <div
                  className={cn(
                    "max-w-[82%] rounded-2xl px-3 py-2 text-[12.5px] leading-[1.6]",
                    msg.role === "user"
                      ? "bg-atlas-accent text-white rounded-br-md"
                      : "bg-atlas-surface text-atlas-text rounded-bl-md"
                  )}
                >
                  {msg.content.split("\n").map((line, i) => (
                    <span key={i}>
                      {line}
                      {i < msg.content.split("\n").length - 1 && <br />}
                    </span>
                  ))}
                  {msg.toolCall && (
                    <div className="mt-1 flex items-center gap-1 text-xs opacity-60">
                      <CheckCircle2 className="h-2.5 w-2.5" />
                      {msg.toolCall.toolName.replace(/_/g, " ")}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {isTyping && (
              <div className="flex gap-2">
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-atlas-accent/10 mt-0.5">
                  <Orbit className="h-2.5 w-2.5 text-atlas-accent" />
                </div>
                <div className="rounded-2xl rounded-bl-md bg-atlas-surface px-3 py-2">
                  <div className="flex gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-atlas-text-dim animate-bounce [animation-delay:0ms]" />
                    <span className="h-1.5 w-1.5 rounded-full bg-atlas-text-dim animate-bounce [animation-delay:150ms]" />
                    <span className="h-1.5 w-1.5 rounded-full bg-atlas-text-dim animate-bounce [animation-delay:300ms]" />
                  </div>
                </div>
              </div>
            )}

            {/* Pending approvals inline */}
            {pendingActions.map((action) => (
              <div key={action.id} className="mx-1 rounded-xl border border-amber-500/20 bg-amber-500/5 p-2.5">
                <div className="flex items-center gap-1.5 text-xs text-amber-300 mb-2">
                  <Clock className="h-3 w-3" />
                  <span className="font-medium">{(action.tool_name ?? "").replace(/_/g, " ")}</span>
                </div>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => handleApprove(action.id)}
                    className="flex-1 flex items-center justify-center gap-1 rounded-lg bg-green-500/10 py-1.5 text-xs font-medium text-green-400 hover:bg-green-500/20 transition-colors"
                  >
                    <CheckCircle2 className="h-3 w-3" /> Approve
                  </button>
                  <button
                    onClick={() => handleReject(action.id)}
                    className="flex-1 flex items-center justify-center gap-1 rounded-lg bg-red-500/10 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/20 transition-colors"
                  >
                    <XCircle className="h-3 w-3" /> Reject
                  </button>
                </div>
              </div>
            ))}

            <div ref={messagesEndRef} />
          </div>

          {/* ── Quick Actions ── */}
          {showQuickActions && (
            <div className="border-t border-atlas-border-subtle px-3 py-2.5">
              <div className="grid grid-cols-2 gap-1.5">
                {QUICK_ACTIONS.map((action) => (
                  <button
                    key={action.label}
                    onClick={() => prefill(action.prompt)}
                    className="flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs text-atlas-text-muted hover:bg-atlas-surface hover:text-atlas-text transition-colors text-left"
                  >
                    <action.icon className="h-3 w-3 shrink-0 text-atlas-accent/50" />
                    {action.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Input ── */}
          <div className="border-t border-atlas-border-subtle px-3 py-2.5">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowQuickActions(!showQuickActions)}
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors",
                  showQuickActions
                    ? "bg-atlas-accent/10 text-atlas-accent"
                    : "text-atlas-text-dim hover:bg-atlas-surface hover:text-atlas-text"
                )}
                title="Quick actions"
              >
                <Sparkles className="h-3.5 w-3.5" />
              </button>
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder="Describe a scene or sound..."
                className="flex-1 bg-transparent text-[12.5px] text-atlas-text placeholder:text-atlas-text-dim focus:outline-none"
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || isTyping}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-atlas-accent text-white transition-all hover:bg-atlas-accent/90 disabled:opacity-30 disabled:cursor-not-allowed active:scale-95"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
