import type { Metadata } from 'next'
import { TrackBooking } from '@/components/booking/TrackBooking'
import { PageHero } from '@/components/layout/PageHero'
import { getBooking, getLocale } from '@/i18n/server'
import { pageMetadata } from '@/lib/seo'

export async function generateMetadata(): Promise<Metadata> {
  const [locale, b] = await Promise.all([getLocale(), getBooking()])
  return pageMetadata({ locale, path: '/booking/track', title: b.track.metaTitle, description: b.track.metaDescription })
}

export default async function TrackPage() {
  const b = await getBooking()
  return (
    <>
      <PageHero compact eyebrow={b.track.eyebrow} title={b.track.title} lead={b.track.lead} crumbs={[{ label: b.metaTitle, href: '/booking' }, { label: b.track.eyebrow }]} />
      <section className="bg-bone-50 py-12 sm:py-16">
        <div className="container-page">
          <TrackBooking b={b} />
        </div>
      </section>
    </>
  )
}
