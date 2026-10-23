import type { Metadata } from 'next'
import { ForgotPasswordForm } from '@/components/auth/PasswordReset'
import { PageHero } from '@/components/layout/PageHero'
import { getAccount, getLocale } from '@/i18n/server'
import { pageMetadata } from '@/lib/seo'

export async function generateMetadata(): Promise<Metadata> {
  const [locale, a] = await Promise.all([getLocale(), getAccount()])
  return pageMetadata({ locale, path: '/forgot-password', title: a.forgot.metaTitle, description: a.forgot.lead, noIndex: true })
}

export default async function ForgotPasswordPage() {
  const a = await getAccount()
  return (
    <>
      <PageHero compact eyebrow={a.forgot.eyebrow} title={a.forgot.title} lead={a.forgot.lead} crumbs={[{ label: a.forgot.metaTitle }]} />
      <section className="bg-bone-50 py-12 sm:py-16">
        <div className="container-page">
          <ForgotPasswordForm a={a.forgot} back={a.forgot.back} />
        </div>
      </section>
    </>
  )
}
