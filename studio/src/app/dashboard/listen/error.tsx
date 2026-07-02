"use client";

import { RouteError } from "../components/route-error";

export default function ListenError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <RouteError module="Listen" {...props} />;
}
