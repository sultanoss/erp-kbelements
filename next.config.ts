import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Bundle assets/ directory into serverless functions (fonts, ICC profile for PDF/A-3)
  outputFileTracingIncludes: {
    "**": ["./assets/**"],
  },
};

export default nextConfig;
