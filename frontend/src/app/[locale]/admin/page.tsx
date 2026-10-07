import type { Metadata } from 'next'
import { AdminConsole } from '@/components/admin/AdminConsole'
import { PageHero } from '@/components/layout/PageHero'
import { getAccount, getBooking, getLocale, getManage } from '@/i18n/server'
import { pageMetadata } from '@/lib/seo'

export async function generateMetadata(): Promise<Metadata> {
  const [locale, a] = await Promise.all([getLocale(), getAccount()])
  return pageMetadata({ locale, path: '/admin', title: a.admin.metaTitle, description: a.admin.lead, noIndex: true })
}

export default async function AdminPage() {
  const [a, b, m] = await Promise.all([getAccount(), getBooking(), getManage()])
  return (
    <>
      <PageHero compact eyebrow={a.admin.eyebrow} title={a.admin.title} lead={a.admin.lead} crumbs={[{ label: a.admin.metaTitle }]} />
      <section className="bg-bone-50 py-12 sm:py-16">
        <div className="container-page">
          <AdminConsole a={a.admin} b={b} m={m} />
        </div>
      </section>
    </>
  )
}
