"use client";

import { RouteError } from "../components/route-error";

export default function AtmosphereBuilderError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <RouteError module="Atmosphere Builder" {...props} />;
}
