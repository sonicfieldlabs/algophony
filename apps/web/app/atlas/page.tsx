import { CATEGORIES, getPrompts } from "../lib/data";
import Link from "next/link";

export default function AtlasPage() {
  const prompts = getPrompts();
  const counts = prompts.reduce<Record<string, number>>((acc, prompt) => {
    acc[prompt.category] = (acc[prompt.category] || 0) + 1;
    return acc;
  }, {});

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Algophony Atlas</h1>
        <p className="page-subtitle">100 controlled prompts for algorithmic soundscape evaluation</p>
      </div>
      {prompts.length === 0 && (
        <div className="notice-card">
          No prompt corpus is mounted. Public code exports include the Atlas machinery without local research data.
        </div>
      )}
      <div className="card-grid">
        {CATEGORIES.map((category) => (
          <div className="card" key={category}>
            <div className="card-title">{category.replace(/_/g, " ")}</div>
            <div className="card-meta">{counts[category] || 0} prompts</div>
            <Link href={`/prompts?category=${category}`} className="inline-action">Browse category</Link>
          </div>
        ))}
      </div>
    </>
  );
}
