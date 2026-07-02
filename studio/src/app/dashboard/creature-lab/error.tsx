"use client";

import { RouteError } from "../components/route-error";

export default function CreatureLabError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <RouteError module="Creature Lab" {...props} />;
}
