import type { Metadata } from 'next'
import { Suspense } from 'react'
import { JsonLd } from '@/components/content/JsonLd'
import { Landing } from '@/components/landing/Landing'
import { contactDetails } from '@/components/layout/ContactButtons'
import { site, siteUrl } from '@/content/site'
import { href } from '@/i18n/config'
import { getLanding, getLocale } from '@/i18n/server'
import { currentYear } from '@/lib/clock'
import { pageMetadata } from '@/lib/seo'

export async function generateMetadata(): Promise<Metadata> {
  const [locale, t] = await Promise.all([getLocale(), getLanding()])
  const metadata = pageMetadata({ locale, path: '/', title: t.metaTitle, description: t.metaDescription })
  // The full title, without the site name appended by the layout's template.
  return { ...metadata, title: { absolute: t.metaTitle } }
}

/** The page, with the business's current phone, WhatsApp, email and Instagram. */
async function Page() {
  const [locale, t, settings, year] = await Promise.all([getLocale(), getLanding(), contactDetails(), currentYear()])
  const contact = {
    phone: settings?.phone ?? null,
    whatsapp: settings?.whatsapp ?? null,
    email: settings?.email ?? null,
    instagram: settings?.social.instagram || null,
  }
  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'TaxiService',
          name: site.name,
          description: t.metaDescription,
          url: `${siteUrl}${href(locale)}`,
          ...(settings ? { telephone: settings.phone, email: settings.email } : {}),
          areaServed: [
            { '@type': 'City', name: 'Madrid' },
            { '@type': 'Country', name: 'Spain' },
          ],
          address: { '@type': 'PostalAddress', addressLocality: 'Madrid', addressCountry: 'ES' },
          availableLanguage: ['English', 'Spanish'],
        }}
      />
      <Landing t={t} locale={locale} contact={contact} year={year} />
    </>
  )
}

export default function HomePage() {
  return (
    <>
      {/* Without JavaScript the film cannot load: never leave the page behind the loader. */}
      <noscript>
        <style>{'.landing-loader{display:none}'}</style>
      </noscript>
      <Suspense fallback={<div className="min-h-dvh bg-[#0e0b08]" />}>
        <Page />
      </Suspense>
    </>
  )
}
