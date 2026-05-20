import { getGenerations, getPrompts, getReports, modelTypeLabel } from "../lib/data";
import Link from "next/link";

export default function GenerationsPage() {
  const generations = getGenerations();
  const promptMap = Object.fromEntries(getPrompts().map((prompt) => [prompt.prompt_id, prompt]));
  const modelCounts: Record<string, number> = {};
  for (const generation of generations) modelCounts[generation.model] = (modelCounts[generation.model] || 0) + 1;

  const reportCounts: Record<string, number> = {};
  for (const report of getReports()) {
    reportCounts[report.audio_id] = (reportCounts[report.audio_id] || 0) + 1;
  }

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Generations</h1>
        <p className="page-subtitle">
          {generations.length} audio files from {Object.keys(modelCounts).length} procedural controls
        </p>
      </div>
      {generations.length === 0 && (
        <div className="notice-card">
          No generation metadata is mounted. Public code exports exclude local generated metadata and audio.
        </div>
      )}

      <div className="stats-row">
        {Object.entries(modelCounts).map(([model, count]) => (
          <div className="stat-card" key={model}>
            <div className="stat-value">{count}</div>
            <div className="stat-label">{model}</div>
          </div>
        ))}
      </div>

      {generations.length > 0 && (
        <div className="notice-card">
          Current files are procedural controls. ML text-to-audio generation remains pending until a provider key or local
          model is configured and generated metadata is added.
        </div>
      )}

      <div className="card" style={{ overflowX: "auto" }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Audio ID</th>
              <th>Prompt</th>
              <th>Category</th>
              <th>Model</th>
              <th>Type</th>
              <th>Reports</th>
              <th>Seed</th>
              <th>Duration</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {generations.map((generation) => {
              const prompt = promptMap[generation.prompt_id];
              const reportCount = reportCounts[generation.audio_id] || 0;
              return (
                <tr key={generation.audio_id}>
                  <td>
                    <Link href={`/generations/${generation.audio_id}`} className="mono-link">{generation.audio_id}</Link>
                  </td>
                  <td>
                    <Link href={`/prompts/${generation.prompt_id}`} className="mono-link">{generation.prompt_id}</Link>
                  </td>
                  <td>{prompt && <span className="badge badge-category">{prompt.category.replace(/_/g, " ")}</span>}</td>
                  <td>{generation.model}</td>
                  <td>
                    <span className="badge badge-control">{modelTypeLabel(generation.model)}</span>
                  </td>
                  <td className="mono-cell">{reportCount}</td>
                  <td className="mono-cell" style={{ color: generation.seed == null ? "var(--text-muted)" : undefined }}>
                    {generation.seed ?? "random"}
                  </td>
                  <td className="mono-cell">{generation.duration}s</td>
                  <td style={{ color: "var(--text-muted)", fontSize: 12 }}>{generation.generation_date}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
