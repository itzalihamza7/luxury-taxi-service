import localFont from 'next/font/local'
import type { ReactNode } from 'react'
import 'lenis/dist/lenis.css'
import { CookieConsent } from '@/components/layout/CookieConsent'
import { WhatsAppTracker } from '@/components/layout/WhatsAppTracker'

// The home page's body face, bundled like the others (SIL Open Font License).
const manrope = localFont({
  src: '../../../fonts/Manrope-Variable.woff2',
  variable: '--font-manrope',
  weight: '200 800',
  display: 'swap',
})

/** The home page brings its own navigation and footer; it shares only the cookie notice with the rest of the site. */
export default function LandingLayout({ children }: { children: ReactNode }) {
  return (
    <div className={`contents ${manrope.variable}`}>
      {children}
      <CookieConsent />
      <WhatsAppTracker />
    </div>
  )
}
