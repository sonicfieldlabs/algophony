import { getGenerations, getPrompts } from "../lib/data";
import Link from "next/link";

export default function GenerationsPage() {
  const generations = getGenerations();
  const promptMap = Object.fromEntries(getPrompts().map((p) => [p.prompt_id, p]));

  const modelCounts: Record<string, number> = {};
  for (const g of generations) modelCounts[g.model] = (modelCounts[g.model] || 0) + 1;

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Generations</h1>
        <p className="page-subtitle">{generations.length} audio files from {Object.keys(modelCounts).length} models</p>
      </div>

      <div className="stats-row">
        {Object.entries(modelCounts).map(([model, count]) => (
          <div className="stat-card" key={model}>
            <div className="stat-value">{count}</div>
            <div className="stat-label">{model}</div>
          </div>
        ))}
      </div>

      <div className="card" style={{ overflowX: "auto" }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Audio ID</th>
              <th>Prompt</th>
              <th>Category</th>
              <th>Model</th>
              <th>Duration</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {generations.map((g) => {
              const prompt = promptMap[g.prompt_id];
              return (
                <tr key={g.audio_id}>
                  <td style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>{g.audio_id}</td>
                  <td>
                    <Link href={`/prompts/${g.prompt_id}`} style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>
                      {g.prompt_id}
                    </Link>
                  </td>
                  <td>
                    {prompt && <span className="badge badge-category">{prompt.category.replace(/_/g, " ")}</span>}
                  </td>
                  <td style={{ fontSize: 13 }}>{g.model}</td>
                  <td style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>{g.duration}s</td>
                  <td style={{ color: "var(--text-muted)", fontSize: 12 }}>{g.date}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
