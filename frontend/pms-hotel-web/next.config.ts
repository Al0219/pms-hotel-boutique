import type { NextConfig } from 'next';

const isDocker = process.env.DOCKER_BUILD === 'true';

const nextConfig: NextConfig = {
  ...(isDocker ? { output: 'standalone' } : {}),
  images: { unoptimized: true },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;

