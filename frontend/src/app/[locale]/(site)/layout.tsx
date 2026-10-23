import { Suspense, type ReactNode } from 'react'
import { CookieConsent } from '@/components/layout/CookieConsent'
import { contactDetails } from '@/components/layout/ContactButtons'
import { Footer } from '@/components/layout/Footer'
import { Header } from '@/components/layout/Header'
import { ServiceLinks } from '@/components/layout/HeaderData'
import { MobileBar } from '@/components/layout/MobileBar'
import { WhatsAppTracker } from '@/components/layout/WhatsAppTracker'
import { currentYear } from '@/lib/clock'

/** The frame of the public website: header, footer, the phone action bar and the cookie notice. */
export default async function SiteLayout({ children }: { children: ReactNode }) {
  const year = await currentYear()

  return (
    <div className="formal contents">
      {/*
        The page frame is sent at once. What comes from the console (the services
        menu, footer links) follows a moment later in the same response.
      */}
      <Header
        serviceLinks={
          <Suspense fallback={null}>
            <ServiceLinks />
          </Suspense>
        }
        mobileServiceLinks={
          <Suspense fallback={null}>
            <ServiceLinks mobile />
          </Suspense>
        }
      />
      <main id="main" className="flex-1">
        {children}
      </main>
      <Suspense fallback={<div aria-hidden className="h-96 bg-ink-950" />}>
        <Footer year={year} />
      </Suspense>
      <Suspense fallback={null}>
        <SiteMobileBar />
      </Suspense>
      <CookieConsent />
      <WhatsAppTracker />
    </div>
  )
}

async function SiteMobileBar() {
  const settings = await contactDetails()
  return <MobileBar phone={settings?.phone ?? null} whatsapp={settings?.whatsapp ?? null} />
}
