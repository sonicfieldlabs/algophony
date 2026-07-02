"use client";

import { RouteError } from "../components/route-error";

export default function SceneError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <RouteError module="Scene" {...props} />;
}
