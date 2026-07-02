"use client";

import { RouteError } from "../components/route-error";

export default function HumanLabError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <RouteError module="Human Lab" {...props} />;
}
