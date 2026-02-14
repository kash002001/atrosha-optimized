import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  // output: "standalone", // Commented out for Vercel deployment
  transpilePackages: ["recharts"],
};
export default nextConfig;