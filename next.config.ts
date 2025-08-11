import type { NextConfig } from "next";

// Note: projects.json validation is handled at runtime by projectConfigCache
// This keeps the config file focused on configuration only

const nextConfig: NextConfig = {
  // Enable standalone output for Docker
  output: 'standalone',
  
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
