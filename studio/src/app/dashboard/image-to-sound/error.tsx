"use client";

import { RouteError } from "../components/route-error";

export default function ImageToSoundError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <RouteError module="Image to Sound" {...props} />;
}
