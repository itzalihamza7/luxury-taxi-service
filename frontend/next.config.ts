import type { NextConfig } from 'next'

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  // Lets nginx-style reverse proxies pass streamed HTML through without buffering.
  { key: 'X-Accel-Buffering', value: 'no' },
]

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // Self-contained server bundle for the Docker image.
  output: 'standalone',
  poweredByHeader: false,
  // The DDEV hostname must be allowed to load dev-only assets (hot reload).
  allowedDevOrigins: ['*.ddev.site'],
  images: {
    formats: ['image/avif', 'image/webp'],
    // Only these may be resized: photos that ship with the site, and photos uploaded in the console.
    localPatterns: [
      { pathname: '/images/**', search: '' },
      { pathname: '/api/media/**', search: '' },
    ],
  },
  turbopack: {
    rules: {
      '*.css': {
        loaders: ['@tailwindcss/turbopack'],
        as: '*.css',
      },
    },
  },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }]
  },
}

export default nextConfig
