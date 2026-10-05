import type { MetadataRoute } from 'next'
import { siteUrl } from '@/content/site'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // Private, per-visitor pages have nothing to offer a search engine.
        disallow: ['/api/', '/*/account', '/*/admin', '/*/login', '/*/register', '/*/booking/payment'],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  }
}
