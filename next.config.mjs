/** @type {import('next').NextConfig} */

import { setupDevPlatform } from '@cloudflare/next-on-pages/next-dev';

// Here we use the @cloudflare/next-on-pages next-dev module to allow us to use bindings during local development
// (when running the application with `next dev`), for more information see:
// https://github.com/cloudflare/next-on-pages/blob/main/internal-packages/next-dev/README.md
if (process.env.NODE_ENV === 'development') {
  await setupDevPlatform();
}

const nextConfig = {
  // Configure for Cloudflare Pages with edge runtime (NOT static export)
  // Static export cannot support API routes with database operations
  
  // Disable image optimization for Cloudflare Pages compatibility
  images: {
    unoptimized: true,
  },
  
  // Configure webpack for edge runtime compatibility
  webpack: (config, { nextRuntime }) => {
    if (nextRuntime === 'edge') {
      return config;
    }
    return config;
  },
  
  // Configure strict mode
  reactStrictMode: true,
  
  // Ensure proper headers for Cloudflare Pages
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      },
    ];
  },
};

export default nextConfig;