"use client";

import { RouteError } from "../components/route-error";

export default function ExportError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <RouteError module="Export" {...props} />;
}
