"use client";

import { RouteError } from "../components/route-error";

export default function ProjectsError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <RouteError module="Projects" {...props} />;
}
