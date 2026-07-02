"use client";

import { useState } from "react";
import Link from "next/link";
import {
  LifeBuoy,
  ArrowLeft,
  Send,
  Bug,
  FolderKanban,
  Sparkles,
  HelpCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

const SUPPORT_URL =
  process.env.NEXT_PUBLIC_SUPPORT_URL || "https://github.com/sonicfieldlabs/algophony/issues";

// Pre-defined categories so issue titles stay tidy.
const TOPICS = [
  { id: "bug", label: "Bug report", icon: Bug, hint: "Something broke. Include browser, OS, and steps to reproduce." },
  { id: "local", label: "Local workflow", icon: FolderKanban, hint: "Folder indexing, file formats, metadata, or local storage questions." },
  { id: "feature", label: "Research feature", icon: Sparkles, hint: "Dataset, comparison, tagging, export, or listening workflow ideas." },
  { id: "other", label: "Other", icon: HelpCircle, hint: "Anything else." },
] as const;

type TopicId = (typeof TOPICS)[number]["id"];

export default function SupportPage() {
  const [topic, setTopic] = useState<TopicId>("bug");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  const canSend = message.trim().length > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSend) return;
    const topicLabel = TOPICS.find((t) => t.id === topic)?.label ?? "Support";
    const subject = `[Algophony Studio · ${topicLabel}] ${message.split("\n")[0].slice(0, 60)}`;
    const body = [
      name ? `From: ${name}` : null,
      email ? `Reply-to: ${email}` : null,
      `Topic: ${topicLabel}`,
      "",
      message,
      "",
      "-",
      "Sent from Algophony Studio feedback page.",
    ]
      .filter((line) => line !== null)
      .join("\n");
    const issueUrl = new URL(`${SUPPORT_URL.replace(/\/+$/, "")}/new`);
    issueUrl.searchParams.set("title", subject);
    issueUrl.searchParams.set("body", body);
    window.location.href = issueUrl.toString();
  };

  return (
    <div className="p-6 max-w-3xl mx-auto animate-fade-in">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-xs text-atlas-text-muted hover:text-atlas-text transition-colors mb-4"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to workspace
      </Link>

      <div className="flex items-center gap-3 mb-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-atlas-accent-muted">
          <LifeBuoy className="h-5 w-5 text-atlas-accent" strokeWidth={1.5} />
        </div>
        <div>
          <h1 className="atlas-title-lg">Support</h1>
          <p className="text-xs text-atlas-text-muted mt-0.5">
            Send feedback about the workspace.
          </p>
        </div>
      </div>

      {/* Instructions */}
      <div className="atlas-card p-5 mb-5 space-y-3">
        <h2 className="text-sm font-semibold text-atlas-text">Before you send</h2>
        <ul className="space-y-2 text-xs text-atlas-text-muted leading-relaxed">
          <li>
            - <span className="text-atlas-text font-medium">For bugs</span> - tell us your browser,
            OS, exact page, and what you expected vs. what happened. Screenshots help.
          </li>
          <li>
            - <span className="text-atlas-text font-medium">For local libraries</span> - include
            file formats, folder shape, approximate library size, and what metadata you expected.
          </li>
          <li>
            - <span className="text-atlas-text font-medium">For research requests</span> - describe
            the dataset, benchmark, export, or listening workflow you are trying to support.
          </li>
          <li>
            - This is an open-source project, so implementation details matter.
          </li>
        </ul>
        <p className="text-xs text-atlas-text-muted leading-relaxed pt-2 border-t border-atlas-border-subtle">
          You can also open the project issue tracker directly at{" "}
          <a
            href={SUPPORT_URL}
            className="font-medium text-atlas-accent hover:underline"
            rel="noreferrer"
            target="_blank"
          >
            {SUPPORT_URL.replace(/^https?:\/\//, "")}
          </a>{" "}
          if the form doesn&rsquo;t fit your situation.
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="atlas-card p-5 space-y-4">
        <div>
          <span className="atlas-eyebrow block mb-2">Topic</span>
          <div className="grid grid-cols-2 gap-2">
            {TOPICS.map((t) => {
              const Icon = t.icon;
              const selected = topic === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTopic(t.id)}
                  className={cn(
                    "flex items-start gap-2 rounded-lg border px-3 py-2.5 text-left transition-colors",
                    selected
                      ? "border-atlas-accent bg-atlas-accent-muted text-atlas-accent"
                      : "border-atlas-border-subtle bg-atlas-surface text-atlas-text-muted hover:border-atlas-border hover:text-atlas-text"
                  )}
                >
                  <Icon className="h-4 w-4 mt-0.5 shrink-0" strokeWidth={1.5} />
                  <div className="min-w-0">
                    <span className="block text-sm font-medium leading-tight">{t.label}</span>
                    <span className="block text-[11px] text-atlas-text-muted mt-0.5 leading-snug">
                      {t.hint}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="support-name" className="atlas-eyebrow block mb-1.5">
              Name (optional)
            </label>
            <input
              id="support-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="What should we call you?"
              className="w-full rounded-lg border border-atlas-border bg-atlas-bg px-3 py-2 text-sm text-atlas-text placeholder-atlas-text-dim focus:border-atlas-accent focus:outline-none focus:ring-2 focus:ring-atlas-accent/10"
            />
          </div>
          <div>
            <label htmlFor="support-email" className="atlas-eyebrow block mb-1.5">
              Reply email (optional)
            </label>
            <input
              id="support-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-lg border border-atlas-border bg-atlas-bg px-3 py-2 text-sm text-atlas-text placeholder-atlas-text-dim focus:border-atlas-accent focus:outline-none focus:ring-2 focus:ring-atlas-accent/10"
            />
          </div>
        </div>

        <div>
          <label htmlFor="support-message" className="atlas-eyebrow block mb-1.5">
            Message
          </label>
          <textarea
            id="support-message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Describe what you're seeing or what you need…"
            rows={6}
            className="w-full rounded-lg border border-atlas-border bg-atlas-bg px-3 py-2 text-sm text-atlas-text placeholder-atlas-text-dim resize-y focus:border-atlas-accent focus:outline-none focus:ring-2 focus:ring-atlas-accent/10"
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <p className="text-[11px] text-atlas-text-muted inline-flex items-center gap-1.5">
            <Send className="h-3 w-3" /> Opens a prefilled public issue in your browser.
          </p>
          <button
            type="submit"
            disabled={!canSend}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
              canSend
                ? "bg-atlas-accent text-white hover:bg-atlas-accent-hover"
                : "bg-atlas-surface-hover text-atlas-text-dim cursor-not-allowed"
            )}
          >
            <Send className="h-3.5 w-3.5" />
            Open issue
          </button>
        </div>
      </form>
    </div>
  );
}
