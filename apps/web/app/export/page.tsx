import { fileExists, getSuite } from "../lib/data";

export default function ExportPage() {
  const suite = getSuite();
  const exports = suite?.exports;
  const staticExports = [
    ["Prompts JSONL", "atlas/prompts/algophony-atlas-v0.1.jsonl"],
    ["Generations JSONL", "generations/metadata/generations-v0.1.jsonl"],
    ["Scores JSONL", "benchmark/scores/scores-v0.1.jsonl"],
    ["Provider Status JSON", "benchmark/exports/provider-status.json"],
  ].filter(([, relPath]) => fileExists(relPath));
  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Export</h1>
        <p className="page-subtitle">CSV, JSON, Markdown, prompts, metadata, and reports</p>
      </div>
      <div className="card-grid">
        {exports && Object.entries(exports).filter(([, relPath]) => fileExists(relPath)).map(([kind, relPath]) => (
          <div className="card" key={kind}>
            <div className="card-title">{kind.toUpperCase()}</div>
            <div className="card-meta">{relPath}</div>
            <a className="inline-action" href={`/files/${relPath}`}>Open export</a>
          </div>
        ))}
        {staticExports.map(([title, relPath]) => (
          <div className="card" key={title}>
            <div className="card-title">{title}</div>
            <div className="card-meta">{relPath}</div>
            <a className="inline-action" href={`/files/${relPath}`}>Open file</a>
          </div>
        ))}
        {!exports && staticExports.length === 0 && (
          <div className="notice-card">
            No export files are present. The public code release intentionally ships without local benchmark result data.
          </div>
        )}
      </div>
    </>
  );
}
