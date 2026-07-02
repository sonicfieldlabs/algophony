"use client";

import { RouteError } from "../components/route-error";

export default function SupervisorError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <RouteError module="Supervisor" {...props} />;
}
