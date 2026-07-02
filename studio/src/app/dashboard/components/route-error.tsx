"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";

interface RouteErrorProps {
  module: string;
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * Shared error boundary UI for dashboard subroutes.
 * Each /dashboard/<area>/error.tsx renders this with its own module name,
 * so the user sees which area crashed and can retry locally instead of
 * bubbling to the global error boundary.
 */
export function RouteError({ module, error, reset }: RouteErrorProps) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-atlas-danger/10">
          <AlertTriangle className="h-7 w-7 text-atlas-danger" />
        </div>
        <h2 className="atlas-title mb-2">{module} failed to load</h2>
        <p className="mb-2 text-sm text-atlas-text-muted">
          An error occurred in this module. The rest of the dashboard is still usable.
        </p>
        {error.digest && (
          <p className="mb-4 font-mono text-xs text-atlas-text-muted">
            Error ID: {error.digest}
          </p>
        )}
        {process.env.NODE_ENV === "development" && (
          <details className="mb-4 rounded-lg border border-atlas-border bg-atlas-bg p-3 text-left">
            <summary className="cursor-pointer text-sm font-medium text-atlas-text">
              Error details
            </summary>
            <pre className="mt-2 max-h-48 overflow-auto text-xs text-atlas-danger">
              {error.message}
              {error.stack && `\n\n${error.stack}`}
            </pre>
          </details>
        )}
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 rounded-lg bg-atlas-accent px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-atlas-accent-hover"
        >
          <RotateCcw className="h-4 w-4" />
          Try again
        </button>
      </div>
    </div>
  );
}
