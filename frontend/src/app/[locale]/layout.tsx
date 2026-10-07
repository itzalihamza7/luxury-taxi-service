import type { Metadata, Viewport } from 'next'
import localFont from 'next/font/local'
import { Suspense } from 'react'
import { AuthProvider } from '@/components/auth/AuthProvider'
import { CookieConsent } from '@/components/layout/CookieConsent'
import { contactDetails } from '@/components/layout/ContactButtons'
import { PathnameTracker } from '@/components/layout/CurrentPath'
import { Footer } from '@/components/layout/Footer'
import { Header } from '@/components/layout/Header'
import { MobileBar } from '@/components/layout/MobileBar'
import { site, siteUrl } from '@/content/site'
import { I18nProvider } from '@/i18n/client'
import { locales } from '@/i18n/config'
import { common } from '@/i18n/messages/common'
import { getLocale } from '@/i18n/server'
import { currentYear } from '@/lib/clock'
import { loadCollection, quietly } from '@/lib/server-api'
import '../globals.css'

// Fonts are bundled with the app (SIL Open Font License), so builds never depend on a font CDN.
const inter = localFont({
  src: '../../fonts/Inter-Variable.woff2',
  variable: '--font-inter',
  weight: '100 900',
  display: 'swap',
})

const instrumentSerif = localFont({
  src: [
    { path: '../../fonts/InstrumentSerif-Regular.woff2', weight: '400', style: 'normal' },
    { path: '../../fonts/InstrumentSerif-Italic.woff2', weight: '400', style: 'italic' },
  ],
  variable: '--font-instrument',
  display: 'swap',
})

/** The two languages are the only values `[locale]` can take; both are built ahead of time. */
export function generateStaticParams() {
  return locales.map((locale) => ({ locale }))
}

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${site.name} ${site.descriptor} — ${site.city}`,
    template: `%s · ${site.name} ${site.descriptor}`,
  },
  applicationName: `${site.name} ${site.descriptor}`,
  formatDetection: { telephone: false },
}

export const viewport: Viewport = {
  themeColor: '#07080a',
  colorScheme: 'light',
}

export default async function RootLayout({ children }: LayoutProps<'/[locale]'>) {
  const locale = await getLocale()
  const year = await currentYear()

  return (
    <html lang={locale} className={`${inter.variable} ${instrumentSerif.variable}`}>
      <body className="flex min-h-dvh flex-col">
        <I18nProvider locale={locale} messages={common[locale]}>
          <AuthProvider>
            {/*
              The page frame is sent at once. What comes from the console (the services
              menu, phone number, footer links) follows a moment later in the same response.
            */}
            <Suspense fallback={<Header services={[]} phone={null} />}>
              <SiteHeader />
            </Suspense>
            <main id="main" className="flex-1">
              {children}
            </main>
            <Suspense fallback={<div aria-hidden className="h-96 bg-ink-950" />}>
              <Footer year={year} />
            </Suspense>
            <Suspense fallback={null}>
              <SiteMobileBar />
            </Suspense>
            <PathnameTracker />
            <CookieConsent />
          </AuthProvider>
        </I18nProvider>
      </body>
    </html>
  )
}

async function SiteHeader() {
  const [locale, services, settings] = await Promise.all([getLocale(), quietly('the services', loadCollection('service'), []), contactDetails()])
  return <Header services={services.map((service) => ({ slug: service.slug, title: service.title[locale] }))} phone={settings?.phone ?? null} />
}

async function SiteMobileBar() {
  const settings = await contactDetails()
  return <MobileBar phone={settings?.phone ?? null} whatsapp={settings?.whatsapp ?? null} />
}
