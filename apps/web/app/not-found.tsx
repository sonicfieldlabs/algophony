import Link from "next/link";

export default function NotFound() {
  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Not found</h1>
        <p className="page-subtitle">The page or record you requested does not exist.</p>
      </div>
      <div className="notice-card">
        This may mean the ID is invalid, the file is missing from the local data root, or the public release ships
        without the corresponding research corpus.
      </div>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Link className="inline-action" href="/">Overview</Link>
        <Link className="filter-btn" href="/atlas">Atlas</Link>
        <Link className="filter-btn" href="/prompts">Prompts</Link>
        <Link className="filter-btn" href="/generations">Generations</Link>
        <Link className="filter-btn" href="/reports">Reports</Link>
      </div>
    </>
  );
}
