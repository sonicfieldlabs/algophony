"use client";

import { History, Download, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ExportJob, ExportJobStatus } from "@/lib/sfx/export-taxonomy";

const STATUS_COLORS: Record<ExportJobStatus, { bg: string; text: string }> = {
  draft: { bg: "bg-atlas-surface-hover", text: "text-atlas-text-dim" },
  queued: { bg: "bg-blue-100 dark:bg-blue-900/20", text: "text-blue-700 dark:text-blue-400" },
  running: { bg: "bg-yellow-100 dark:bg-yellow-900/20", text: "text-yellow-700 dark:text-yellow-400" },
  completed: { bg: "bg-green-100 dark:bg-green-900/20", text: "text-green-700 dark:text-green-400" },
  failed: { bg: "bg-red-100 dark:bg-red-900/20", text: "text-red-700 dark:text-red-400" },
  expired: { bg: "bg-atlas-surface-hover", text: "text-atlas-text-dim" },
  cancelled: { bg: "bg-atlas-surface-hover", text: "text-atlas-text-dim" },
};

interface ExportJobHistoryProps {
  jobs?: ExportJob[];
}

// Demo data for the UI
const DEMO_JOBS: ExportJob[] = [
  {
    id: "job-001", userId: "", exportType: "prompt_database", sourceType: "full_workspace",
    sourceIds: [], filters: {} as ExportJob["filters"], formats: ["json"],
    includeAudio: false, includeMetadata: true, includePrompts: true, includeUsage: false,
    status: "completed", fileUrl: "#", createdAt: new Date(Date.now() - 3600000).toISOString(),
    completedAt: new Date(Date.now() - 3500000).toISOString(),
  },
  {
    id: "job-002", userId: "", exportType: "cue_sheet", sourceType: "single_project",
    sourceIds: [], filters: {} as ExportJob["filters"], formats: ["csv"],
    includeAudio: false, includeMetadata: true, includePrompts: true, includeUsage: false,
    status: "completed", createdAt: new Date(Date.now() - 86400000).toISOString(),
    completedAt: new Date(Date.now() - 86300000).toISOString(),
  },
  {
    id: "job-003", userId: "", exportType: "backup", sourceType: "full_workspace",
    sourceIds: [], filters: {} as ExportJob["filters"], formats: ["json"],
    includeAudio: true, includeMetadata: true, includePrompts: true, includeUsage: true,
    status: "expired", createdAt: new Date(Date.now() - 604800000).toISOString(),
    expiresAt: new Date(Date.now() - 518400000).toISOString(),
  },
];

export function ExportJobHistory({ jobs = DEMO_JOBS }: ExportJobHistoryProps) {
  return (
    <div className="space-y-4">
      <div className="atlas-card p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-atlas-accent" />
            <h3 className="text-sm font-semibold text-atlas-text">Export History</h3>
          </div>
          <span className="text-xs text-atlas-text-dim">{jobs.length} export{jobs.length !== 1 ? "s" : ""}</span>
        </div>

        {jobs.length === 0 ? (
          <div className="text-center py-8 text-xs text-atlas-text-muted">
            No exports yet. Create your first export from any tab above.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-atlas-border">
            <table className="w-full text-xs">
              <thead className="bg-atlas-surface">
                <tr>
                  <th className="px-3 py-2 text-left text-atlas-text-dim font-medium">Type</th>
                  <th className="px-3 py-2 text-left text-atlas-text-dim font-medium">Source</th>
                  <th className="px-3 py-2 text-left text-atlas-text-dim font-medium">Format</th>
                  <th className="px-3 py-2 text-left text-atlas-text-dim font-medium">Status</th>
                  <th className="px-3 py-2 text-left text-atlas-text-dim font-medium">Created</th>
                  <th className="px-3 py-2 text-left text-atlas-text-dim font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((job) => {
                  const colors = STATUS_COLORS[job.status];
                  return (
                    <tr key={job.id} className="border-t border-atlas-border-subtle hover:bg-atlas-surface-hover/30">
                      <td className="px-3 py-2 text-atlas-text capitalize">{job.exportType.replace(/_/g, " ")}</td>
                      <td className="px-3 py-2 text-atlas-text-muted capitalize">{job.sourceType.replace(/_/g, " ")}</td>
                      <td className="px-3 py-2 text-atlas-text-muted uppercase">{job.formats.join(", ")}</td>
                      <td className="px-3 py-2">
                        <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", colors.bg, colors.text)}>
                          {job.status}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-atlas-text-dim">
                        {new Date(job.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1">
                          {job.status === "completed" && job.fileUrl && (
                            <button className="text-atlas-accent hover:underline flex items-center gap-0.5" title="Download">
                              <Download className="h-3 w-3" />
                            </button>
                          )}
                          {job.status === "failed" && (
                            <button className="text-atlas-text-dim hover:text-atlas-accent" title="Retry">
                              <RefreshCw className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
