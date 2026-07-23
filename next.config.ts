import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingExcludes: {
    "*": ["**/(portal)/page_client-reference-manifest.js"],
  },
};

export default nextConfig;
