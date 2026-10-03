import type { Metadata } from 'next'
import { BookingWizard } from '@/components/booking/BookingWizard'
import { PageHero } from '@/components/layout/PageHero'
import { getBooking, getLocale } from '@/i18n/server'
import { pageMetadata } from '@/lib/seo'

export async function generateMetadata(): Promise<Metadata> {
  const [locale, b] = await Promise.all([getLocale(), getBooking()])
  return pageMetadata({ locale, path: '/booking', title: b.metaTitle, description: b.metaDescription })
}

export default async function BookingPage() {
  const b = await getBooking()
  return (
    <>
      <PageHero compact eyebrow={b.eyebrow} title={b.title} lead={b.lead} crumbs={[{ label: b.metaTitle }]} />
      <section className="bg-bone-50 py-12 sm:py-16">
        <div className="container-page">
          <BookingWizard b={b} />
        </div>
      </section>
    </>
  )
}
