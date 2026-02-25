import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  // output: "standalone", // Commented out for Vercel deployment
  transpilePackages: ["recharts"],
  typescript: {
    ignoreBuildErrors: true,
  },
};
export default nextConfig;