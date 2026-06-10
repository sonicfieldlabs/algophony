import type { NextConfig } from "next";
import { loadEnvConfig } from "@next/env";
import path from "node:path";

const repoRoot = path.resolve(/* turbopackIgnore: true */ process.cwd(), "../..");
loadEnvConfig(repoRoot);

const nextConfig: NextConfig = {
  outputFileTracingRoot: repoRoot,
  turbopack: {
    root: repoRoot,
  },
};

export default nextConfig;
