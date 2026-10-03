import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Solo standalone si NO estamos en Vercel
  ...(process.env.VERCEL ? {} : { output: "standalone" }),
};

export default nextConfig;
