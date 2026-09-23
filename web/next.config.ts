import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  redirects: () => [
    { source: "/evm/tx/:hash", destination: "/tx/:hash", permanent: true },
    { source: "/evm/address/:address", destination: "/address/:address", permanent: true },
  ],
};

export default nextConfig;
