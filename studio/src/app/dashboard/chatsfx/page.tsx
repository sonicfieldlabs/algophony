import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth/current-user";
import { ChatSfxClient } from "./ChatSfxClient";

/**
 * ChatSFX — Wilhelm's main workspace.
 *
 * Top-level Workspace entry. Full-page chat hub that wraps every supervisor
 * tool: scene breakdowns, batch prompt cards, batch generations, routing to
 * specialised tools, cost estimation, etc. The floating FAB is still available
 * everywhere for quick access; this page is for deeper sessions.
 *
 * Workspace bridge: supervisor access uses local project metadata and
 * user-configured provider keys.
 */
export default async function ChatSfxPage() {
  const profile = await getCurrentProfile();

  // The workspace auth shim should always provide a workspace profile.
  if (!profile) redirect("/dashboard/home");

  return (
    <ChatSfxClient
      plan="team"
      creditsRemaining={Number.MAX_SAFE_INTEGER}
    />
  );
}
