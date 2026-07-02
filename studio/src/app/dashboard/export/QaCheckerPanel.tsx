"use client";

import { useState, useMemo, useCallback } from "react";
import {
  ShieldCheck, ChevronDown, ChevronRight, CircleCheck, AlertTriangle,
  XCircle, Info, ToggleLeft, ToggleRight, Download,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  QA_CHECKS, QA_CHECK_GROUPS, QA_GROUP_LABELS,
  runBatchQa,
  type QaCheckId, type QaCheckGroup, type QaBatchReport,
} from "@/lib/sfx/qa-checker";

interface QaCheckerPanelProps {
  generations: Record<string, unknown>[];
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
}

const SEVERITY_ICONS = {
  pass: CircleCheck,
  warning: AlertTriangle,
  error: XCircle,
  info: Info,
};

const SEVERITY_COLORS = {
  pass: "text-green-400",
  warning: "text-orange-400",
  error: "text-red-400",
  info: "text-blue-400",
};

const STATUS_BG = {
  pass: "bg-green-400/10 text-green-400",
  warn: "bg-orange-400/10 text-orange-400",
  fail: "bg-red-400/10 text-red-400",
};

export function QaCheckerPanel({ generations, enabled, onToggle }: QaCheckerPanelProps) {
  const [expandedGroups, setExpandedGroups] = useState<Set<QaCheckGroup>>(new Set(["metadata", "technical"]));
  const [expandedAsset, setExpandedAsset] = useState<string | null>(null);
  const [checkedIds, setCheckedIds] = useState<Set<QaCheckId>>(
    new Set(QA_CHECKS.filter((c) => !c.isDsp).map((c) => c.id))
  );
  const [hasRun, setHasRun] = useState(false);
  const [report, setReport] = useState<QaBatchReport | null>(null);
  const [showOnlyIssues, setShowOnlyIssues] = useState(false);

  const toggleGroup = (group: QaCheckGroup) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(group)) next.delete(group); else next.add(group);
      return next;
    });
  };

  const toggleCheck = (id: QaCheckId) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleRun = useCallback(() => {
    const result = runBatchQa(generations, [...checkedIds]);
    setReport(result);
    setHasRun(true);
  }, [generations, checkedIds]);

  const filteredReports = useMemo(() => {
    if (!report) return [];
    if (showOnlyIssues) return report.assetReports.filter((r) => r.overallStatus !== "pass");
    return report.assetReports;
  }, [report, showOnlyIssues]);

  const handleExportReport = () => {
    if (!report) return;
    const content = JSON.stringify(report, null, 2);
    const blob = new Blob([content], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `algophony_studio_qa_report_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="atlas-card overflow-hidden">
      {/* Header with toggle */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-atlas-border-subtle">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-atlas-accent" />
          <h3 className="text-sm font-semibold text-atlas-text">Technical QA</h3>
          <span className="text-xs text-atlas-text-dim rounded-full bg-atlas-surface-hover px-2 py-0.5">
            {generations.length} assets
          </span>
        </div>
        <button
          onClick={() => onToggle(!enabled)}
          className={cn(
            "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all border",
            enabled
              ? "bg-atlas-accent/5 border-atlas-accent/30 text-atlas-accent"
              : "bg-atlas-surface-hover border-atlas-border-subtle text-atlas-text-dim"
          )}
        >
          {enabled ? <ToggleRight className="h-3.5 w-3.5" /> : <ToggleLeft className="h-3.5 w-3.5" />}
          {enabled ? "Enabled" : "Disabled"}
        </button>
      </div>

      {enabled && (
        <div className="p-4 space-y-4">
          {/* Check selector by group */}
          <div className="space-y-1.5">
            {QA_CHECK_GROUPS.map((group) => {
              const checks = QA_CHECKS.filter((c) => c.group === group);
              const enabledInGroup = checks.filter((c) => checkedIds.has(c.id)).length;
              const isExpanded = expandedGroups.has(group);
              const isDsp = group === "dsp";

              return (
                <div key={group} className={cn("rounded-xl border overflow-hidden", isDsp ? "border-atlas-border-subtle/50 opacity-60" : "border-atlas-border-subtle")}>
                  <button
                    onClick={() => toggleGroup(group)}
                    className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-atlas-surface-hover/30 transition-colors"
                  >
                    <span className="text-xs font-semibold text-atlas-text flex items-center gap-1.5">
                      {QA_GROUP_LABELS[group]}
                      {isDsp && <span className="text-xs bg-atlas-surface-hover text-atlas-text-dim rounded px-1">FUTURE</span>}
                      <span className="text-atlas-text-dim font-normal">({enabledInGroup}/{checks.length})</span>
                    </span>
                    {isExpanded ? <ChevronDown className="h-3 w-3 text-atlas-text-dim" /> : <ChevronRight className="h-3 w-3 text-atlas-text-dim" />}
                  </button>

                  {isExpanded && (
                    <div className="px-3 pb-2.5 space-y-1">
                      {checks.map((check) => (
                        <label key={check.id} className={cn("flex items-start gap-2 py-1 cursor-pointer group", isDsp && "cursor-not-allowed opacity-40")}>
                          <input
                            type="checkbox"
                            checked={checkedIds.has(check.id)}
                            onChange={() => !isDsp && toggleCheck(check.id)}
                            disabled={isDsp}
                            className="mt-0.5 h-3 w-3 rounded accent-atlas-accent"
                          />
                          <div>
                            <span className="text-xs font-medium text-atlas-text group-hover:text-atlas-accent transition-colors">{check.label}</span>
                            <p className="text-xs text-atlas-text-dim leading-tight">{check.description}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Run button */}
          <button
            onClick={handleRun}
            disabled={checkedIds.size === 0 || generations.length === 0}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-atlas-accent py-2.5 text-sm font-medium text-white hover:bg-atlas-accent-hover transition-all disabled:opacity-50"
          >
            <ShieldCheck className="h-4 w-4" />
            Run QA Pass ({checkedIds.size} checks × {generations.length} assets)
          </button>

          {/* Results */}
          {hasRun && report && (
            <div className="space-y-3">
              {/* Summary */}
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-lg bg-green-400/5 border border-green-400/10 p-2.5 text-center">
                  <div className="text-lg font-bold text-green-400 tabular-nums">{report.passedAssets}</div>
                  <div className="text-xs text-green-400/70 uppercase tracking-wider">Passed</div>
                </div>
                <div className="rounded-lg bg-orange-400/5 border border-orange-400/10 p-2.5 text-center">
                  <div className="text-lg font-bold text-orange-400 tabular-nums">{report.warnedAssets}</div>
                  <div className="text-xs text-orange-400/70 uppercase tracking-wider">Warnings</div>
                </div>
                <div className="rounded-lg bg-red-400/5 border border-red-400/10 p-2.5 text-center">
                  <div className="text-lg font-bold text-red-400 tabular-nums">{report.failedAssets}</div>
                  <div className="text-xs text-red-400/70 uppercase tracking-wider">Failed</div>
                </div>
              </div>

              {/* Filter toggle */}
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-xs text-atlas-text-muted cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showOnlyIssues}
                    onChange={(e) => setShowOnlyIssues(e.target.checked)}
                    className="h-3 w-3 rounded accent-atlas-accent"
                  />
                  Show only issues
                </label>
                <button
                  onClick={handleExportReport}
                  className="flex items-center gap-1.5 text-xs text-atlas-accent hover:underline"
                >
                  <Download className="h-3 w-3" /> Export Report
                </button>
              </div>

              {/* Per-asset details */}
              <div className="space-y-1 max-h-[400px] overflow-y-auto">
                {filteredReports.map((assetReport) => (
                  <div key={assetReport.assetId} className="rounded-lg border border-atlas-border-subtle overflow-hidden">
                    <button
                      onClick={() => setExpandedAsset(expandedAsset === assetReport.assetId ? null : assetReport.assetId)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-atlas-surface-hover/30 transition-colors"
                    >
                      <span className={cn("rounded-full px-1.5 py-0.5 text-xs font-medium", STATUS_BG[assetReport.overallStatus])}>
                        {assetReport.overallStatus}
                      </span>
                      <span className="text-xs text-atlas-text font-mono truncate flex-1">{assetReport.filename}</span>
                      <div className="flex items-center gap-1.5 text-xs text-atlas-text-dim shrink-0">
                        {assetReport.errorCount > 0 && <span className="text-red-400">{assetReport.errorCount}E</span>}
                        {assetReport.warnCount > 0 && <span className="text-orange-400">{assetReport.warnCount}W</span>}
                        <span className="text-green-400">{assetReport.passCount}✓</span>
                      </div>
                    </button>

                    {expandedAsset === assetReport.assetId && (
                      <div className="border-t border-atlas-border-subtle px-3 py-2 space-y-1">
                        {assetReport.results.map((result) => {
                          const Icon = SEVERITY_ICONS[result.severity];
                          return (
                            <div key={result.checkId} className="flex items-start gap-2 py-0.5">
                              <Icon className={cn("h-3 w-3 mt-0.5 shrink-0", SEVERITY_COLORS[result.severity])} />
                              <div className="flex-1 min-w-0">
                                <span className="text-xs text-atlas-text">{result.message}</span>
                                {result.details && (
                                  <span className="text-xs text-atlas-text-dim ml-1">({result.details})</span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
