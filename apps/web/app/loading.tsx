export default function RouteLoading() {
  return (
    <>
      <div className="page-header">
        <h1 className="page-title">
          <span className="loading-shimmer" style={{ width: "40%", display: "inline-block" }}>&nbsp;</span>
        </h1>
        <p className="page-subtitle">Loading…</p>
      </div>
      <div className="stats-row" aria-hidden="true">
        {[0, 1, 2, 3].map((i) => (
          <div className="stat-card" key={i}>
            <div className="stat-value loading-shimmer">&nbsp;</div>
            <div className="stat-label loading-shimmer">&nbsp;</div>
          </div>
        ))}
      </div>
      <div className="card-grid" aria-hidden="true">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div className="card" key={i}>
            <div className="card-title loading-shimmer">&nbsp;</div>
            <div className="card-meta loading-shimmer">&nbsp;</div>
          </div>
        ))}
      </div>
    </>
  );
}
