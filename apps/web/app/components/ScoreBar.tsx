import { scoreLevel, scorePct } from "../lib/score-bar";

export function ScoreBar({ value, axis }: { value: number | null | undefined; axis: string }) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return <span className="score-bar-empty" title="No data">—</span>;
  }
  const level = scoreLevel(value, axis);
  const pct = scorePct(value);
  return (
    <span className="score-bar">
      <span className="score-value">{value}</span>
      <span className="score-bar-track">
        <span className="score-bar-fill" style={{ width: `${pct}%` }} data-level={level} />
      </span>
    </span>
  );
}
