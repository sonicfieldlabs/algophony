"use client";

import { RouteError } from "../components/route-error";

export default function CardsError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <RouteError module="Cards" {...props} />;
}
