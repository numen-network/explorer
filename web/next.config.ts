import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  redirects: () => [
    { source: "/tx/:hash", destination: "/evm/tx/:hash", permanent: true },
    { source: "/address/:address", destination: "/evm/address/:address", permanent: true },
  ],
};

export default nextConfig;
