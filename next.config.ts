import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Only needed locally where client/ lives inside server/ monorepo
  ...(process.env.VERCEL !== "1" && {
    outputFileTracingRoot: path.join(__dirname, ".."),
  }),
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
};

export default nextConfig;
