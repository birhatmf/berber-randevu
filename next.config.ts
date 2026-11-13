import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typedRoutes: false,
  eslint: { ignoreDuringBuilds: true },
  experimental: {
    serverActions: { bodySizeLimit: "22mb" },
  },
};

export default nextConfig;
