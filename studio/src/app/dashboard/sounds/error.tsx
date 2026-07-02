"use client";

import { RouteError } from "../components/route-error";

export default function SoundsError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <RouteError module="Sounds" {...props} />;
}
