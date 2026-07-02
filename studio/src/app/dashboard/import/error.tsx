"use client";

import { RouteError } from "../components/route-error";

export default function ImportError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <RouteError module="Import" {...props} />;
}
