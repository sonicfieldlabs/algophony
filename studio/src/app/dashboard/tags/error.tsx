"use client";

import { RouteError } from "../components/route-error";

export default function TagsError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <RouteError module="Tags" {...props} />;
}
