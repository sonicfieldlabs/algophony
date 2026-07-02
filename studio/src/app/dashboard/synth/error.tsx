"use client";

import { RouteError } from "../components/route-error";

export default function SynthError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <RouteError module="Synth" {...props} />;
}
