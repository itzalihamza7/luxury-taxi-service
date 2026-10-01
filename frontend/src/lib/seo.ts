import type { Metadata } from 'next'
import { site, siteUrl } from '@/content/site'
import { defaultLocale, href, locales, localeTags, type Locale } from '@/i18n/config'

interface PageMeta {
  locale: Locale
  /** Path without the language prefix, e.g. `/fleet`. Use `/` for the home page. */
  path: string
  title: string
  description: string
  /** Keep private pages (account, admin, booking confirmation) out of search results. */
  noIndex?: boolean
}

/** Title, description, canonical URL, `hreflang` alternates and Open Graph tags for a page. */
export function pageMetadata({ locale, path, title, description, noIndex }: PageMeta): Metadata {
  const url = `${siteUrl}${href(locale, path)}`
  const languages: Record<string, string> = { 'x-default': `${siteUrl}${href(defaultLocale, path)}` }
  for (const other of locales) languages[localeTags[other]] = `${siteUrl}${href(other, path)}`

  return {
    title,
    description,
    alternates: { canonical: url, languages },
    openGraph: {
      type: 'website',
      url,
      title,
      description,
      siteName: `${site.name} ${site.descriptor}`,
      locale: localeTags[locale].replace('-', '_'),
    },
    twitter: { card: 'summary_large_image', title, description },
    robots: noIndex ? { index: false, follow: false } : undefined,
  }
}
