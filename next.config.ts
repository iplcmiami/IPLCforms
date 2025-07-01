import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare';
import type { NextConfig } from 'next';

// Initialize OpenNext Cloudflare for local development
// This allows us to use Cloudflare bindings during local development
if (process.env.NODE_ENV === 'development') {
  await initOpenNextCloudflareForDev();
}

const nextConfig: NextConfig = {
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
};

export default nextConfig;
