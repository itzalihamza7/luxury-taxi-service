import type { Metadata, Viewport } from 'next'
import localFont from 'next/font/local'
import { AuthProvider } from '@/components/auth/AuthProvider'
import { CookieConsent } from '@/components/layout/CookieConsent'
import { PathnameTracker } from '@/components/layout/CurrentPath'
import { Footer } from '@/components/layout/Footer'
import { Header } from '@/components/layout/Header'
import { MobileBar } from '@/components/layout/MobileBar'
import { services } from '@/content/services'
import { site, siteUrl } from '@/content/site'
import { I18nProvider } from '@/i18n/client'
import { locales } from '@/i18n/config'
import { common } from '@/i18n/messages/common'
import { getLocale } from '@/i18n/server'
import { currentYear } from '@/lib/clock'
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
            <Header services={services.map((service) => ({ slug: service.slug, title: service.title[locale] }))} />
            <main id="main" className="flex-1">
              {children}
            </main>
            <Footer year={year} />
            <MobileBar />
            <PathnameTracker />
            <CookieConsent />
          </AuthProvider>
        </I18nProvider>
      </body>
    </html>
  )
}
