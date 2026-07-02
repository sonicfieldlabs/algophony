"use client";

import { RouteError } from "../components/route-error";

export default function UsageError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <RouteError module="Usage" {...props} />;
}
