"use client";

import { RouteError } from "../components/route-error";

export default function UiElementsError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <RouteError module="UI Elements" {...props} />;
}
