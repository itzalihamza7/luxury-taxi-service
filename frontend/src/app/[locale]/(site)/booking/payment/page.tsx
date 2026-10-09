import type { Metadata } from 'next'
import { PaymentReturn } from '@/components/booking/PaymentReturn'
import { PageHero } from '@/components/layout/PageHero'
import { getBooking, getLocale } from '@/i18n/server'
import { pageMetadata } from '@/lib/seo'

export async function generateMetadata(): Promise<Metadata> {
  const [locale, b] = await Promise.all([getLocale(), getBooking()])
  return pageMetadata({ locale, path: '/booking/payment', title: b.pay.metaTitle, description: b.metaDescription, noIndex: true })
}

export default async function PaymentPage() {
  const b = await getBooking()
  return (
    <>
      <PageHero compact eyebrow={b.pay.eyebrow} title={b.title} crumbs={[{ label: b.metaTitle, href: '/booking' }, { label: b.pay.eyebrow }]} />
      <section className="bg-bone-50 py-12 sm:py-16">
        <div className="container-page">
          <PaymentReturn b={b} />
        </div>
      </section>
    </>
  )
}
