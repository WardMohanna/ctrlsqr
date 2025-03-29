import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
};

module.exports = {
  typescript: {
    // WARNING: This allows production builds to succeed even if there are type errors.
    ignoreBuildErrors: true,
  },
};

module.exports = {
  eslint: {
    // WARNING: This will allow your production build to pass even if ESLint finds issues.
    ignoreDuringBuilds: true,
  },
};


export default nextConfig;
