import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'export',
  images: { unoptimized: true },
  outputFileTracingRoot: undefined,
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
