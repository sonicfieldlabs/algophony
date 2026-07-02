"use client";

import { RouteError } from "../components/route-error";

export default function GenerationsError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <RouteError module="Generations" {...props} />;
}
