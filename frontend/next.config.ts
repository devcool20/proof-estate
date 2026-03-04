import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // output: 'export', // Removed to support dynamic routes and server-side features
  images: {
    unoptimized: true,
  },
  /* config options here */
};

export default nextConfig;
