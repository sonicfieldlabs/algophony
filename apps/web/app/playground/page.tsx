import { notFound } from "next/navigation";
import PlaygroundClient from "./PlaygroundClient";

const STUDIO_ENABLED = process.env.ALGOPHONY_ENABLE_STUDIO === "true";

export default function PlaygroundPage() {
  if (!STUDIO_ENABLED) {
    notFound();
  }

  return <PlaygroundClient />;
}
