import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth/current-user";
import { SupervisorWorkspace } from "./supervisor-workspace";

export const metadata = {
  title: "Wilhelm — Agent | Algophony Studio",
  description: "AI sound supervisor agent for professional sound design planning",
};

export default async function SupervisorPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/dashboard/home");

  return (
    <SupervisorWorkspace
      userId={profile.id}
      userPlan="local"
    />
  );
}
