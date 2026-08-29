import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@vale-ou-golpe/contracts"],
  async rewrites() {
    const backendPort = process.env.BACKEND_PORT ?? "4000";
    return [{ source: "/api/:path*", destination: `http://127.0.0.1:${backendPort}/api/:path*` }];
  },
};

export default nextConfig;
