import { notFound } from "next/navigation";
import PlaygroundClient from "./PlaygroundClient";

const STUDIO_ENABLED = process.env.ALGOPHONY_ENABLE_STUDIO === "true";

export default function PlaygroundPage() {
  if (!STUDIO_ENABLED) {
    notFound();
  }
  // If a token is configured server-side, surface it to the client so it can
  // attach `x-studio-token` on /api/generate and /api/upload requests.
  const studioToken = process.env.ALGOPHONY_STUDIO_TOKEN || "";
  return <PlaygroundClient studioToken={studioToken} />;
}
