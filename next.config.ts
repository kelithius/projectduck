import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    BASE_PATH: process.env.BASE_PATH || '/Users/Keith/Workspace/ProjectDuck/example',
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        os: false,
      };
    }
    return config;
  },
};

export default nextConfig;
