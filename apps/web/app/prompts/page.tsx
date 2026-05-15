import { getPrompts, CATEGORIES } from "../lib/data";
import Link from "next/link";

export default function PromptsPage() {
  const prompts = getPrompts();

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Prompt Atlas</h1>
        <p className="page-subtitle">{prompts.length} prompts across {CATEGORIES.length} categories</p>
      </div>

      <div className="card" style={{ overflowX: "auto" }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Category</th>
              <th>Prompt Text</th>
              <th>Duration</th>
              <th>Loop</th>
              <th>Difficulty</th>
              <th>Sources</th>
            </tr>
          </thead>
          <tbody>
            {prompts.map((p) => (
              <tr key={p.prompt_id}>
                <td>
                  <Link href={`/prompts/${p.prompt_id}`} style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>
                    {p.prompt_id}
                  </Link>
                </td>
                <td><span className="badge badge-category">{p.category.replace(/_/g, " ")}</span></td>
                <td style={{ maxWidth: 400, fontSize: 12, color: "var(--text-secondary)" }}>
                  {p.prompt_text.slice(0, 120)}…
                </td>
                <td style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>{p.duration_target}s</td>
                <td>{p.loop_required ? <span className="badge badge-loop">loop</span> : "—"}</td>
                <td><span className={`badge badge-difficulty-${p.difficulty}`}>{p.difficulty}</span></td>
                <td style={{ fontSize: 11 }}>{p.intended_sources.length} intended / {p.forbidden_sources.length} forbidden</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
