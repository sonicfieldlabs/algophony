"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-atlas-danger/10">
          <AlertTriangle className="h-7 w-7 text-atlas-danger" />
        </div>
        <h2 className="mb-2 text-lg font-semibold text-atlas-text">
          Something went wrong
        </h2>
        <p className="mb-1 text-sm text-atlas-text-muted">
          An error occurred while loading this page. This has been logged for investigation.
        </p>
        {error.digest && (
          <p className="mb-4 font-mono text-xs text-atlas-text-dim">
            Error ID: {error.digest}
          </p>
        )}
        {process.env.NODE_ENV === "development" && (
          <details className="mb-4 rounded-lg border border-atlas-border bg-atlas-bg p-3 text-left">
            <summary className="cursor-pointer text-xs text-atlas-text-muted">
              Error Details
            </summary>
            <pre className="mt-2 max-h-40 overflow-auto text-xs text-atlas-danger">
              {error.message}
              {error.stack && `\n\n${error.stack}`}
            </pre>
          </details>
        )}
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 rounded-lg bg-atlas-accent px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-atlas-accent-hover"
        >
          <RotateCcw className="h-4 w-4" />
          Try Again
        </button>
      </div>
    </div>
  );
}
