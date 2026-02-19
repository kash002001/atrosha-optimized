import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  // output: "standalone", // Commented out for Vercel deployment
  transpilePackages: ["recharts"],
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};
export default nextConfig;