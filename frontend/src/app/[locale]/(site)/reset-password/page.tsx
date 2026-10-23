import type { Metadata } from 'next'
import { ResetPasswordForm } from '@/components/auth/PasswordReset'
import { PageHero } from '@/components/layout/PageHero'
import { getAccount, getLocale } from '@/i18n/server'
import { pageMetadata } from '@/lib/seo'

export async function generateMetadata(): Promise<Metadata> {
  const [locale, a] = await Promise.all([getLocale(), getAccount()])
  return pageMetadata({ locale, path: '/reset-password', title: a.reset.metaTitle, description: a.reset.lead, noIndex: true })
}

export default async function ResetPasswordPage() {
  const a = await getAccount()
  return (
    <>
      <PageHero compact eyebrow={a.reset.eyebrow} title={a.reset.title} lead={a.reset.lead} crumbs={[{ label: a.reset.metaTitle }]} />
      <section className="bg-bone-50 py-12 sm:py-16">
        <div className="container-page">
          <ResetPasswordForm a={a.reset} />
        </div>
      </section>
    </>
  )
}
