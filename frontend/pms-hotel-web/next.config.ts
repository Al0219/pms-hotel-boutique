import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: { unoptimized: true },
  outputFileTracingRoot: undefined,
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
