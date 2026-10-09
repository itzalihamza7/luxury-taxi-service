import type { Metadata } from 'next'
import { AccountDashboard } from '@/components/account/AccountDashboard'
import { PageHero } from '@/components/layout/PageHero'
import { getAccount, getBooking, getLocale } from '@/i18n/server'
import { pageMetadata } from '@/lib/seo'

export async function generateMetadata(): Promise<Metadata> {
  const [locale, a] = await Promise.all([getLocale(), getAccount()])
  return pageMetadata({ locale, path: '/account', title: a.account.metaTitle, description: a.account.lead, noIndex: true })
}

export default async function AccountPage() {
  const [a, b] = await Promise.all([getAccount(), getBooking()])
  return (
    <>
      <PageHero compact eyebrow={a.account.eyebrow} title={a.account.metaTitle} crumbs={[{ label: a.account.metaTitle }]} />
      <section className="bg-bone-50 py-12 sm:py-16">
        <div className="container-page max-w-5xl">
          <AccountDashboard a={a.account} b={b} />
        </div>
      </section>
    </>
  )
}
