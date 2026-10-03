import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  outputFileTracingRoot: undefined,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
