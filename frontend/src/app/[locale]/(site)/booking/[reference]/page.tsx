import type { Metadata } from 'next'
import { TrackBooking } from '@/components/booking/TrackBooking'
import { PageHero } from '@/components/layout/PageHero'
import { getBooking, getLocale } from '@/i18n/server'
import { pageMetadata } from '@/lib/seo'

/** A booking's own page: it opens with the customer's account, or with the guest code from the booking email. */
export async function generateMetadata(): Promise<Metadata> {
  const [locale, b] = await Promise.all([getLocale(), getBooking()])
  return pageMetadata({ locale, path: '/booking/track', title: b.track.eyebrow, description: b.track.metaDescription, noIndex: true })
}

export default async function BookingPage() {
  const b = await getBooking()
  return (
    <>
      <PageHero compact eyebrow={b.track.eyebrow} title={b.track.title} crumbs={[{ label: b.metaTitle, href: '/booking' }, { label: b.track.eyebrow }]} />
      <section className="bg-bone-50 py-12 sm:py-16">
        <div className="container-page">
          <TrackBooking b={b} />
        </div>
      </section>
    </>
  )
}
