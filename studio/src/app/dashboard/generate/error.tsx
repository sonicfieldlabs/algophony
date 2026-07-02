"use client";

import { RouteError } from "../components/route-error";

export default function GenerateError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <RouteError module="Generate" {...props} />;
}
