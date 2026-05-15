import type { NextConfig } from "next";
import path from "node:path";

const repoRoot = path.resolve(/* turbopackIgnore: true */ process.cwd(), "../..");

const nextConfig: NextConfig = {
  outputFileTracingRoot: repoRoot,
  turbopack: {
    root: repoRoot,
  },
};

export default nextConfig;
