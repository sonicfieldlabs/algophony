import { CATEGORIES, getGenerations, getPrompts } from "../lib/data";
import Link from "next/link";

type Search = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] || "" : value || "";
}

export default async function PromptsPage({ searchParams }: { searchParams?: Promise<Search> }) {
  const params = (await searchParams) || {};
  const category = first(params.category);
  const difficulty = first(params.difficulty);
  const loop = first(params.loop);
  const focus = first(params.focus);
  const modelCoverage = first(params.coverage);

  const generations = getGenerations();
  const generationCounts = generations.reduce<Record<string, number>>((acc, generation) => {
    acc[generation.prompt_id] = (acc[generation.prompt_id] || 0) + 1;
    return acc;
  }, {});

  const focusOptions = [...new Set(getPrompts().flatMap((prompt) => prompt.evaluation_focus))].sort();
  const prompts = getPrompts().filter((prompt) => {
    if (category && prompt.category !== category) return false;
    if (difficulty && prompt.difficulty !== difficulty) return false;
    if (loop === "true" && !prompt.loop_required) return false;
    if (loop === "false" && prompt.loop_required) return false;
    if (focus && !prompt.evaluation_focus.includes(focus)) return false;
    if (modelCoverage === "missing" && generationCounts[prompt.prompt_id]) return false;
    if (modelCoverage === "covered" && !generationCounts[prompt.prompt_id]) return false;
    return true;
  });

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Prompt Atlas</h1>
        <p className="page-subtitle">{prompts.length} visible prompts · {CATEGORIES.length} categories</p>
      </div>
      {getPrompts().length === 0 && (
        <div className="notice-card">
          No prompt data is mounted. Add schema-valid JSONL data or set `ALGOPHONY_DATA_ROOT` for local research mode.
        </div>
      )}

      <form className="filter-panel">
        <label>
          Category
          <select name="category" defaultValue={category}>
            <option value="">All</option>
            {CATEGORIES.map((item) => <option key={item} value={item}>{item.replace(/_/g, " ")}</option>)}
          </select>
        </label>
        <label>
          Difficulty
          <select name="difficulty" defaultValue={difficulty}>
            <option value="">All</option>
            {["calibration", "easy", "medium", "hard", "research"].map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
        <label>
          Loop
          <select name="loop" defaultValue={loop}>
            <option value="">All</option>
            <option value="true">Required</option>
            <option value="false">Not required</option>
          </select>
        </label>
        <label>
          Focus
          <select name="focus" defaultValue={focus}>
            <option value="">All</option>
            {focusOptions.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
        <label>
          Coverage
          <select name="coverage" defaultValue={modelCoverage}>
            <option value="">All</option>
            <option value="covered">Has generation</option>
            <option value="missing">Missing generation</option>
          </select>
        </label>
        <button className="filter-submit" type="submit">Apply</button>
      </form>

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
              <th>Coverage</th>
            </tr>
          </thead>
          <tbody>
            {prompts.map((prompt) => (
              <tr key={prompt.prompt_id}>
                <td><Link href={`/prompts/${prompt.prompt_id}`} className="mono-link">{prompt.prompt_id}</Link></td>
                <td><span className="badge badge-category">{prompt.category.replace(/_/g, " ")}</span></td>
                <td className="table-text">{prompt.prompt_text}</td>
                <td className="mono-cell">{prompt.duration_target}s</td>
                <td>{prompt.loop_required ? <span className="badge badge-loop">loop</span> : "-"}</td>
                <td><span className={`badge badge-difficulty-${prompt.difficulty}`}>{prompt.difficulty}</span></td>
                <td className="mono-cell">{generationCounts[prompt.prompt_id] || 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
