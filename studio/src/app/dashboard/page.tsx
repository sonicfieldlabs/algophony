import { redirect } from "next/navigation";

/**
 * Dashboard root. Sends users to the home overview page — the wordmark / logo
 * in the sidebar also targets `/dashboard/home`.
 */
export default function DashboardRedirect() {
  redirect("/dashboard/home");
}
