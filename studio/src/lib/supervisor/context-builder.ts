/**
 * Algophony Studio — Supervisor Context Builder
 *
 * Builds contextual update strings sent to the ElevenLabs agent
 * when the user navigates the app.
 */

export interface SupervisorContext {
  currentPage: string;
  projectId?: string;
  projectName?: string;
  projectMedium?: string;
  selectedCueId?: string;
  selectedCardTitle?: string;
  selectedCardCategory?: string;
  lastVerdictFeedback?: string;
  userPlan: string;
  creditsRemaining: number;
}

const PAGE_LABELS: Record<string, string> = {
  "/dashboard": "Home",
  "/dashboard/generate": "Generate",
  "/dashboard/creature-lab": "Creature Lab",
  "/dashboard/candy": "Misc",
  "/dashboard/listen": "Listen Mode",
  "/dashboard/ui-elements": "UI Elements",
  "/dashboard/atmosphere-builder": "Atmosphere Builder",
  "/dashboard/stacker": "Stacker",
  "/dashboard/foley-room": "Foley Room",
  "/dashboard/human-lab": "Human Lab",
  "/dashboard/library": "Prompt Card Library",
  "/dashboard/sounds": "Sounds Library",
  "/dashboard/projects": "Projects",
  "/dashboard/variation-lab": "Variation Lab",
  "/dashboard/export": "Export Center",
  "/dashboard/supervisor": "Agent",
};

export function getPageLabel(pathname: string): string {
  if (PAGE_LABELS[pathname]) return PAGE_LABELS[pathname];
  for (const [path, label] of Object.entries(PAGE_LABELS)) {
    if (pathname.startsWith(path + "/")) return label;
  }
  return "Dashboard";
}

export function buildContextualUpdate(ctx: SupervisorContext): string {
  const parts: string[] = [];
  const pageLabel = getPageLabel(ctx.currentPage);
  parts.push(`User is currently in ${pageLabel}.`);

  if (ctx.projectName) {
    parts.push(`Selected project: ${ctx.projectName}.`);
    if (ctx.projectMedium) parts.push(`Project medium: ${ctx.projectMedium}.`);
  }
  if (ctx.selectedCueId) parts.push(`Selected cue: ${ctx.selectedCueId}.`);
  if (ctx.selectedCardTitle) {
    parts.push(`Selected prompt card: ${ctx.selectedCardTitle}${ctx.selectedCardCategory ? ` (${ctx.selectedCardCategory})` : ""}.`);
  }
  if (ctx.lastVerdictFeedback) parts.push(`User marked last result: ${ctx.lastVerdictFeedback}.`);
  parts.push(`Workspace access: ${ctx.userPlan}. Provider-call allowance remaining: ${ctx.creditsRemaining}.`);

  return parts.join(" ");
}
