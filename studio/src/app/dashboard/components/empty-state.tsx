/**
 * Algophony Studio — Empty State Component
 *
 * §5.11: Reusable empty state with value prop, CTA, and example button.
 */

"use client";

import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  ctaLabel?: string;
  ctaHref?: string;
  onCta?: () => void;
  exampleLabel?: string;
  onExample?: () => void;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  ctaLabel,
  ctaHref,
  onCta,
  exampleLabel = "Try an example",
  onExample,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn("flex items-center justify-center atlas-card p-12", className)}>
      <div className="text-center max-w-md">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-atlas-accent-muted">
          <Icon className="h-8 w-8 text-atlas-accent" />
        </div>
        <h3 className="atlas-title mb-2">{title}</h3>
        <p className="text-sm text-atlas-text-muted mb-6 leading-relaxed">{description}</p>

        <div className="flex items-center justify-center gap-3">
          {(ctaLabel && (ctaHref || onCta)) && (
            ctaHref ? (
              <a
                href={ctaHref}
                className="inline-flex items-center gap-2 rounded-lg bg-atlas-accent px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-atlas-accent/20 hover:bg-atlas-accent-hover transition-all active:scale-95"
              >
                {ctaLabel}
              </a>
            ) : (
              <button
                onClick={onCta}
                className="inline-flex items-center gap-2 rounded-lg bg-atlas-accent px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-atlas-accent/20 hover:bg-atlas-accent-hover transition-all active:scale-95"
              >
                {ctaLabel}
              </button>
            )
          )}

          {onExample && (
            <button
              onClick={onExample}
              className="inline-flex items-center gap-2 rounded-lg border border-atlas-border px-5 py-2.5 text-sm font-medium text-atlas-text hover:border-atlas-accent hover:text-atlas-accent transition-all"
            >
              {exampleLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
