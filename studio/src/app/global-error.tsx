"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#0c0d10] text-[#e8e9ed] antialiased flex items-center justify-center p-6">
        <div className="max-w-md text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-900/20">
            <AlertTriangle className="h-7 w-7 text-red-400" />
          </div>
          <h2 className="mb-2 text-lg font-semibold">
            Application Error
          </h2>
          <p className="mb-1 text-sm text-[#8b8d97]">
            A critical error occurred. Please try refreshing the page.
          </p>
          {error.digest && (
            <p className="mb-4 font-mono text-[10px] text-[#5c5e67]">
              Error ID: {error.digest}
            </p>
          )}
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 rounded-lg bg-[#6366f1] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#818cf8]"
          >
            <RotateCcw className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </body>
    </html>
  );
}
