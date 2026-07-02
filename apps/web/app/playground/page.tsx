import { notFound } from "next/navigation";
import PlaygroundClient from "./PlaygroundClient";

const PLAYGROUND_ENABLED = process.env.ALGOPHONY_ENABLE_PLAYGROUND === "true";

export default function PlaygroundPage() {
  if (!PLAYGROUND_ENABLED) {
    notFound();
  }
  // If a token is configured server-side, surface it to the client so it can
  // attach `x-playground-token` on /api/generate and /api/upload requests.
  const playgroundToken = process.env.ALGOPHONY_PLAYGROUND_TOKEN || "";
  return <PlaygroundClient playgroundToken={playgroundToken} />;
}
