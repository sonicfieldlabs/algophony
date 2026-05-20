"use client";

import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[route-error]", error);
  }, [error]);

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Something went wrong</h1>
        <p className="page-subtitle">An error occurred while rendering this page.</p>
      </div>
      <div className="notice-card">
        <div style={{ fontWeight: 600, marginBottom: 6 }}>{error.message || "Unknown error"}</div>
        {error.digest && (
          <div style={{ fontSize: 12, fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>
            digest: {error.digest}
          </div>
        )}
      </div>
      <div style={{ display: "flex", gap: 12 }}>
        <button type="button" className="inline-action" onClick={() => reset()}>
          Try again
        </button>
        <a className="filter-btn" href="/">
          Back to overview
        </a>
      </div>
    </>
  );
}
