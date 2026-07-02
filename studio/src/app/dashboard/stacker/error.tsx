"use client";

import { RouteError } from "../components/route-error";

export default function StackerError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <RouteError module="Stacker" {...props} />;
}
