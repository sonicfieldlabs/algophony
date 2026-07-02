"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { usePathname } from "next/navigation";
import {
  Bot,
  Send,
  Zap,
  ToggleLeft,
  ToggleRight,
  ListChecks,
  Layers,
  FileText,
  PackageCheck,
  Plus,
  MessageSquare,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChatMessage, SupervisorMode, SupervisorAction } from "@/lib/supervisor/types";

interface SupervisorWorkspaceProps {
  userId: string;
  userPlan: string;
}

export function SupervisorWorkspace({
  userId: _userId,
  userPlan,
}: SupervisorWorkspaceProps) {
  const pathname = usePathname();

  // ── State ──
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [mode, setMode] = useState<SupervisorMode>("supervisor");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [pendingActions, setPendingActions] = useState<SupervisorAction[]>([]);
  const [activeTab, setActiveTab] = useState<"cues" | "layers" | "cards" | "export">("cues");
  const [toolOutputs, setToolOutputs] = useState<Record<string, unknown>[]>([]);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [projects, setProjects] = useState<Array<{ id: string; name: string }>>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Load projects
  useEffect(() => {
    void Promise.resolve().then(async () => {
      try {
        const r = await fetch("/api/projects");
        const d = await r.json();
        setProjects(d.projects ?? []);
      } catch {}
    });
  }, []);

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Start Session ──
  const startSession = useCallback(async () => {
    try {
      const res = await fetch("/api/supervisor/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: projectId,
          mode,
          page_context: pathname,
        }),
      });
      const data = await res.json();
      if (data.session) {
        setSessionId(data.session.id);
        setMessages([
          {
            id: "welcome",
            role: "assistant",
            content: mode === "quick"
              ? "Quick Mode active. Tell me what you need and I'll create prompt cards immediately."
              : "Supervisor Mode active. Describe your scene or sound need, and I'll help you plan the full sound design.",
            timestamp: Date.now(),
          },
        ]);
      }
    } catch (err) {
      console.error("Failed to start session:", err);
    }
  }, [projectId, mode, pathname]);

  // Auto-start session
  useEffect(() => {
    if (!sessionId) void Promise.resolve().then(startSession);
  }, [sessionId, startSession]);

  // ── Send Message ──
  const sendMessage = useCallback(async () => {
    if (!input.trim() || !sessionId) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: input.trim(),
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    try {
      // Call the tool endpoint to process the user's request
      // For now, use create_sound_cue_list as a starting point
      const res = await fetch("/api/supervisor/tools/create_sound_cue_list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          project_id: projectId,
          scene_description: userMsg.content,
        }),
      });
      const result = await res.json();

      if (result.success && result.data) {
        setToolOutputs((prev) => [...prev, result.data]);
        const cueCount = result.data.cue_count ?? 0;
        const cueList = (result.data.cues ?? [])
          .map((c: { cue_number: number; title: string; category: string }) =>
            `${c.cue_number}. **${c.title}** (${c.category})`
          )
          .join("\n");

        const assistantMsg: ChatMessage = {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: `I've broken down your scene into **${cueCount} sound cues**:\n\n${cueList}\n\nWould you like me to create prompt cards for these, estimate the generation cost, or refine any of these cues?`,
          timestamp: Date.now(),
          toolCall: {
            toolName: "create_sound_cue_list",
            status: "completed",
          },
        };
        setMessages((prev) => [...prev, assistantMsg]);
      } else {
        const errMsg: ChatMessage = {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: result.error ?? "I encountered an issue processing your request. Could you try rephrasing?",
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, errMsg]);
      }
    } catch {
      const errMsg: ChatMessage = {
        id: `error-${Date.now()}`,
        role: "assistant",
        content: "Connection error. Please try again.",
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setIsTyping(false);
    }
  }, [input, sessionId, projectId]);

  // ── Approve / Reject ──
  const handleApprove = async (actionId: string) => {
    try {
      await fetch(`/api/supervisor/actions/${actionId}/approve`, { method: "POST" });
      setPendingActions((prev) => prev.filter((a) => a.id !== actionId));
    } catch (err) {
      console.error("Approve failed:", err);
    }
  };

  const handleReject = async (actionId: string) => {
    try {
      await fetch(`/api/supervisor/actions/${actionId}/reject`, { method: "POST" });
      setPendingActions((prev) => prev.filter((a) => a.id !== actionId));
    } catch (err) {
      console.error("Reject failed:", err);
    }
  };

  // ── Key handler ──
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // ── Legacy tier gate ──
  if (userPlan === "free") {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <div className="text-center max-w-md space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-atlas-accent/10">
            <Bot className="h-8 w-8 text-atlas-accent" />
          </div>
          <h2 className="text-xl font-semibold text-atlas-text">Wilhelm — Agent</h2>
          <p className="text-sm text-atlas-text-muted">
            The Agent needs a local workspace session and a configured provider key
            for generation workflows.
          </p>
          <a
            href="/dashboard/settings?tab=providers"
            className="inline-flex items-center gap-2 rounded-lg bg-atlas-accent px-4 py-2 text-sm font-medium text-white hover:bg-atlas-accent/90 transition-colors"
          >
            <Zap className="h-4 w-4" /> Provider settings
          </a>
        </div>
      </div>
    );
  }

  const TABS = [
    { key: "cues" as const, label: "Cue List", icon: ListChecks },
    { key: "layers" as const, label: "Layer Plan", icon: Layers },
    { key: "cards" as const, label: "Prompt Cards", icon: FileText },
    { key: "export" as const, label: "Export Plan", icon: PackageCheck },
  ];

  return (
    <div className="flex h-full overflow-hidden">
      {/* ── Left: Chat Panel ── */}
      <div className="flex w-[380px] shrink-0 flex-col border-r border-atlas-border-subtle">
        {/* Chat header */}
        <div className="flex items-center justify-between border-b border-atlas-border-subtle px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-atlas-accent/10">
              <Bot className="h-4 w-4 text-atlas-accent" />
            </div>
            <div>
              <span className="text-sm font-semibold text-atlas-text">Wilhelm</span>
              <span className="block text-xs text-atlas-text-dim">Agent</span>
            </div>
          </div>
          <button
            onClick={() => setMode(mode === "supervisor" ? "quick" : "supervisor")}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-atlas-text-muted hover:bg-atlas-surface-hover transition-colors"
            title={`Switch to ${mode === "supervisor" ? "Quick" : "Supervisor"} Mode`}
          >
            {mode === "supervisor" ? (
              <ToggleRight className="h-4 w-4 text-atlas-accent" />
            ) : (
              <ToggleLeft className="h-4 w-4" />
            )}
            {mode === "supervisor" ? "Supervisor" : "Quick"}
          </button>
        </div>

        {/* Project selector */}
        <div className="border-b border-atlas-border-subtle px-4 py-2">
          <select
            value={projectId ?? ""}
            onChange={(e) => setProjectId(e.target.value || null)}
            className="w-full rounded-lg border border-atlas-border bg-atlas-surface px-3 py-1.5 text-xs text-atlas-text focus:outline-none focus:ring-1 focus:ring-atlas-accent/40"
          >
            <option value="">No project selected</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                "flex gap-2",
                msg.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              {msg.role === "assistant" && (
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-atlas-accent/10 mt-0.5">
                  <Bot className="h-3 w-3 text-atlas-accent" />
                </div>
              )}
              <div
                className={cn(
                  "max-w-[85%] rounded-xl px-3 py-2 text-[13px] leading-relaxed",
                  msg.role === "user"
                    ? "bg-atlas-accent text-white"
                    : "bg-atlas-surface-hover text-atlas-text"
                )}
              >
                {msg.content.split("\n").map((line, i) => (
                  <span key={i}>
                    {line.replace(/\*\*(.*?)\*\*/g, "$1")}
                    {i < msg.content.split("\n").length - 1 && <br />}
                  </span>
                ))}
                {msg.toolCall && (
                  <div className="mt-1.5 flex items-center gap-1 text-xs opacity-70">
                    <ChevronRight className="h-3 w-3" />
                    {msg.toolCall.toolName.replace(/_/g, " ")}
                    {msg.toolCall.status === "completed" && (
                      <CheckCircle2 className="h-3 w-3 text-green-400" />
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
          {isTyping && (
            <div className="flex gap-2">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-atlas-accent/10 mt-0.5">
                <Bot className="h-3 w-3 text-atlas-accent" />
              </div>
              <div className="rounded-xl bg-atlas-surface-hover px-3 py-2 text-[13px] text-atlas-text-muted">
                <span className="inline-flex gap-1">
                  <span className="animate-bounce [animation-delay:0ms]">·</span>
                  <span className="animate-bounce [animation-delay:150ms]">·</span>
                  <span className="animate-bounce [animation-delay:300ms]">·</span>
                </span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t border-atlas-border-subtle p-3">
          <div className="flex gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                mode === "quick"
                  ? "Describe the sound you need..."
                  : "Describe your scene or sound design need..."
              }
              rows={2}
              className="flex-1 resize-none rounded-lg border border-atlas-border bg-atlas-surface px-3 py-2 text-sm text-atlas-text placeholder:text-atlas-text-dim focus:outline-none focus:ring-1 focus:ring-atlas-accent/40"
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || isTyping}
              className="flex h-10 w-10 shrink-0 items-center justify-center self-end rounded-lg bg-atlas-accent text-white transition-all hover:bg-atlas-accent/90 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-atlas-text-dim">
            <span className="flex items-center gap-1">
              <Zap className="h-3 w-3" /> Local provider key
            </span>
            <span>Enter to send · Shift+Enter for newline</span>
          </div>
        </div>
      </div>

      {/* ── Center: Work Area ── */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Tabs */}
        <div className="flex items-center gap-1 border-b border-atlas-border-subtle px-4 py-2">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                activeTab === tab.key
                  ? "bg-atlas-accent-muted text-atlas-accent"
                  : "text-atlas-text-muted hover:bg-atlas-surface-hover hover:text-atlas-text"
              )}
            >
              <tab.icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-auto p-6">
          {toolOutputs.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <div className="text-center space-y-3 max-w-sm">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-atlas-surface-hover">
                  <MessageSquare className="h-6 w-6 text-atlas-text-dim" />
                </div>
                <p className="text-sm text-atlas-text-muted">
                  Start a conversation with Wilhelm to generate cue lists, layer plans, and prompt cards here.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {toolOutputs.map((output, i) => (
                <div key={i} className="rounded-xl border border-atlas-border bg-atlas-surface p-4">
                  {activeTab === "cues" && Array.isArray(output.cues) ? (
                    <div className="space-y-2">
                      <h3 className="text-sm font-semibold text-atlas-text">
                        Sound Cue List ({String(output.cue_count)} cues)
                      </h3>
                      <div className="divide-y divide-atlas-border-subtle">
                        {(output.cues as Array<{ cue_number: number; title: string; category: string; generated_prompt: string }>).map(
                          (cue) => (
                            <div key={cue.cue_number} className="flex items-start gap-3 py-2.5">
                              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-atlas-surface-hover text-xs font-mono text-atlas-text-dim">
                                {cue.cue_number}
                              </span>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium text-atlas-text">{cue.title}</span>
                                  <span className="rounded-full bg-atlas-accent/10 px-2 py-0.5 text-xs font-medium text-atlas-accent">
                                    {cue.category}
                                  </span>
                                </div>
                                <p className="mt-0.5 text-xs text-atlas-text-muted truncate">{cue.generated_prompt}</p>
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  ) : null}
                  {activeTab !== "cues" && (
                    <pre className="text-xs text-atlas-text-muted overflow-auto">
                      {JSON.stringify(output, null, 2)}
                    </pre>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Right: Actions Panel ── */}
      <div className="w-[280px] shrink-0 flex flex-col border-l border-atlas-border-subtle overflow-y-auto">
        {/* Pending approvals */}
        <div className="border-b border-atlas-border-subtle px-4 py-3">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-atlas-text-dim mb-2">
            Pending Approvals
          </h3>
          {pendingActions.length === 0 ? (
            <p className="text-xs text-atlas-text-dim">No actions pending approval.</p>
          ) : (
            <div className="space-y-2">
              {pendingActions.map((action) => (
                <div key={action.id} className="rounded-lg border border-atlas-border bg-atlas-surface p-3 space-y-2">
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3 w-3 text-amber-400" />
                    <span className="text-xs font-medium text-atlas-text">
                      {(action.tool_name ?? "").replace(/_/g, " ")}
                    </span>
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => handleApprove(action.id)}
                      className="flex-1 flex items-center justify-center gap-1 rounded-md bg-green-500/10 py-1 text-xs font-medium text-green-400 hover:bg-green-500/20 transition-colors"
                    >
                      <CheckCircle2 className="h-3 w-3" /> Approve
                    </button>
                    <button
                      onClick={() => handleReject(action.id)}
                      className="flex-1 flex items-center justify-center gap-1 rounded-md bg-red-500/10 py-1 text-xs font-medium text-red-400 hover:bg-red-500/20 transition-colors"
                    >
                      <XCircle className="h-3 w-3" /> Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick actions */}
        <div className="px-4 py-3">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-atlas-text-dim mb-2">
            Suggested Actions
          </h3>
          <div className="space-y-1.5">
            {[
              { label: "Create Cue List", tool: "create_sound_cue_list" },
              { label: "Create Layer Plan", tool: "create_layer_plan" },
              { label: "Create Prompt Cards", tool: "create_prompt_cards_batch" },
              { label: "Estimate Cost", tool: "estimate_generation_cost" },
              { label: "Usage Summary", tool: "get_usage_summary" },
            ].map((action) => (
              <button
                key={action.tool}
                onClick={() => setInput(`Please ${action.label.toLowerCase()} for my current project.`)}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-atlas-text-muted hover:bg-atlas-surface-hover hover:text-atlas-text transition-colors"
              >
                <Plus className="h-3 w-3" />
                {action.label}
              </button>
            ))}
          </div>
        </div>

        {/* Local workspace info */}
        <div className="mt-auto border-t border-atlas-border-subtle px-4 py-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-atlas-text-dim">Provider</span>
            <span className="flex items-center gap-1 font-medium text-atlas-text">
              <Zap className="h-3 w-3 text-atlas-accent" />
              BYO key
            </span>
          </div>
          <div className="mt-1 flex items-center justify-between text-xs">
            <span className="text-atlas-text-dim">Mode</span>
            <span className="capitalize text-atlas-text">{userPlan}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
