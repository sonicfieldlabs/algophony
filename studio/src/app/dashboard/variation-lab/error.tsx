"use client";

import { RouteError } from "../components/route-error";

export default function VariationLabError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <RouteError module="Variation Lab" {...props} />;
}
