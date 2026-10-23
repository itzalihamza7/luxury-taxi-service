import type { NextConfig } from 'next'

/**
 * What pages may load: only this site's own scripts, styles, images and fonts.
 * Next.js needs inline scripts to start the page; development also needs eval
 * and a websocket for hot reload, so the policy is sent by production builds only.
 */
const contentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "connect-src 'self'",
  "frame-src 'none'",
  "frame-ancestors 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ')

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  // Lets nginx-style reverse proxies pass streamed HTML through without buffering.
  { key: 'X-Accel-Buffering', value: 'no' },
  ...(process.env.NODE_ENV === 'production' ? [{ key: 'Content-Security-Policy', value: contentSecurityPolicy }] : []),
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
    // Laptop screens get a picture of their own size instead of the 1920px one.
    deviceSizes: [640, 750, 828, 1080, 1200, 1440, 1680, 1920, 2048, 3840],
    // Resized photos are kept for a month, by the server and by browsers. A photo
    // replaced in the admin panel gets a new address, so nothing stale is shown.
    minimumCacheTTL: 2_592_000,
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
