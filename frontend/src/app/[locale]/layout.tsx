import type { Metadata, Viewport } from 'next'
import localFont from 'next/font/local'
import { AuthProvider } from '@/components/auth/AuthProvider'
import { PathnameTracker } from '@/components/layout/CurrentPath'
import { site, siteUrl } from '@/content/site'
import { I18nProvider } from '@/i18n/client'
import { locales } from '@/i18n/config'
import { common } from '@/i18n/messages/common'
import { getLocale } from '@/i18n/server'
import '../globals.css'

// Fonts are bundled with the app (SIL Open Font License), so builds never depend on a font CDN.
const inter = localFont({
  src: '../../fonts/Inter-Variable.woff2',
  variable: '--font-inter',
  weight: '100 900',
  display: 'swap',
})

// The display face: a classical Garamond for headings and the wordmark.
const cormorant = localFont({
  src: [
    { path: '../../fonts/CormorantGaramond-Variable.woff2', weight: '300 700', style: 'normal' },
    { path: '../../fonts/CormorantGaramond-Italic-Variable.woff2', weight: '300 700', style: 'italic' },
  ],
  variable: '--font-cormorant',
  display: 'swap',
})

/** The two languages are the only values `[locale]` can take; both are built ahead of time. */
export function generateStaticParams() {
  return locales.map((locale) => ({ locale }))
}

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${site.name} — ${site.city}`,
    template: `%s · ${site.name}`,
  },
  applicationName: site.name,
  formatDetection: { telephone: false },
}

export const viewport: Viewport = {
  themeColor: '#080c13',
  colorScheme: 'light',
}

/**
 * What every page shares: the document, fonts, language and who is signed in.
 * The public pages add their header and footer in `(site)/layout.tsx`; the
 * admin panel has its own frame in `admin/layout.tsx`.
 */
export default async function RootLayout({ children }: LayoutProps<'/[locale]'>) {
  const locale = await getLocale()

  return (
    <html lang={locale} className={`${inter.variable} ${cormorant.variable}`}>
      <body className="flex min-h-dvh flex-col">
        <I18nProvider locale={locale} messages={common[locale]}>
          <AuthProvider>
            {children}
            <PathnameTracker />
          </AuthProvider>
        </I18nProvider>
      </body>
    </html>
  )
}
