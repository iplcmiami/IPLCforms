import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',
  typescript: {
    // Temporarily ignore build errors during development
    ignoreBuildErrors: false,
  },
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: false,
  },
  // Cloudflare Pages configuration
  trailingSlash: false,
  images: {
    unoptimized: true
  }
}

export default nextConfig
