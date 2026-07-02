"use client";

import { RouteError } from "../components/route-error";

export default function LibraryError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <RouteError module="Library" {...props} />;
}
