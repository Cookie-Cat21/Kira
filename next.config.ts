import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pg"],
  turbopack: {
    root: path.resolve(process.cwd()),
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "static2.kapruka.com", pathname: "/**" },
      { protocol: "https", hostname: "static.kapruka.com", pathname: "/**" },
      { protocol: "https", hostname: "www.kapruka.com", pathname: "/**" },
      {
        protocol: "https",
        hostname: "partnercentral.kapruka.com",
        pathname: "/**",
      },
      { protocol: "https", hostname: "images.unsplash.com", pathname: "/**" },
    ],
  },
};

export default nextConfig;
