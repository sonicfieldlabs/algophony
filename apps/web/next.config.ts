import type { NextConfig } from "next";
import { loadEnvConfig } from "@next/env";
import { fileURLToPath } from "node:url";

const appRoot = fileURLToPath(new URL(".", import.meta.url));
const repoRoot = fileURLToPath(new URL("../..", import.meta.url));
loadEnvConfig(repoRoot);

const nextConfig: NextConfig = {
  outputFileTracingExcludes: {
    "/*": ["next.config.ts", "next.config.js", "next.config.mjs"],
    "/audio/[id]": ["next.config.ts", "next.config.js", "next.config.mjs"],
  },
  turbopack: {
    root: appRoot,
  },
};

export default nextConfig;
