import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Remove invalid experimental.runtime configuration
  typescript: {
    // Temporarily ignore build errors during development
    ignoreBuildErrors: false,
  },
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: false,
  },
  // Cloudflare Workers specific configuration
  trailingSlash: false,
  images: {
    unoptimized: true
  },
  // Output standalone for serverless deployment (confirmed valid by Next.js docs)
  output: 'standalone'
}

export default nextConfig
