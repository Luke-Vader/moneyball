import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Pin the workspace root explicitly — this repo lives inside a parent
  // directory that has its own unrelated lockfile, which otherwise makes
  // Next.js guess the wrong project root.
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
