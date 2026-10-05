import type { MetadataRoute } from 'next'
import { connection } from 'next/server'
import { events } from '@/content/events'
import { articles } from '@/content/journal'
import { legalDocuments } from '@/content/legal'
import { routes } from '@/content/routes'
import { services } from '@/content/services'
import { siteUrl } from '@/content/site'
import { href, locales, localeTags } from '@/i18n/config'
import { getVehiclesSafely } from '@/lib/server-api'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Built on request rather than at build time, so it can list the vehicles in the database.
  await connection()
  const vehicles = await getVehiclesSafely()

  const pages: { path: string; priority: number; lastModified?: string }[] = [
    { path: '/', priority: 1 },
    { path: '/booking', priority: 0.9 },
    { path: '/services', priority: 0.8 },
    ...services.map((service) => ({ path: `/services/${service.slug}`, priority: 0.8 })),
    { path: '/fleet', priority: 0.8 },
    ...vehicles.map((vehicle) => ({ path: `/fleet/${vehicle.slug}`, priority: 0.7 })),
    { path: '/routes', priority: 0.7 },
    ...routes.map((route) => ({ path: `/routes/${route.slug}`, priority: 0.7 })),
    { path: '/events', priority: 0.6 },
    ...events.map((event) => ({ path: `/events/${event.slug}`, priority: 0.6 })),
    { path: '/journal', priority: 0.6 },
    ...articles.map((article) => ({ path: `/journal/${article.slug}`, priority: 0.5, lastModified: article.date })),
    { path: '/about', priority: 0.5 },
    { path: '/contact', priority: 0.5 },
    { path: '/faq', priority: 0.5 },
    { path: '/booking/track', priority: 0.3 },
    ...legalDocuments.map((document) => ({ path: `/legal/${document.slug}`, priority: 0.2, lastModified: document.updated })),
  ]

  // One entry per language, each pointing at its translations.
  return pages.flatMap((page) =>
    locales.map((locale) => ({
      url: `${siteUrl}${href(locale, page.path)}`,
      lastModified: page.lastModified,
      priority: page.priority,
      alternates: {
        languages: Object.fromEntries(locales.map((other) => [localeTags[other], `${siteUrl}${href(other, page.path)}`])),
      },
    })),
  )
}
