import type { Metadata } from 'next'
import { LoginForm } from '@/components/auth/AuthForms'
import { PageHero } from '@/components/layout/PageHero'
import { getAccount, getLocale } from '@/i18n/server'
import { pageMetadata } from '@/lib/seo'

export async function generateMetadata(): Promise<Metadata> {
  const [locale, a] = await Promise.all([getLocale(), getAccount()])
  return pageMetadata({ locale, path: '/login', title: a.login.metaTitle, description: a.login.lead, noIndex: true })
}

export default async function LoginPage() {
  const a = await getAccount()
  return (
    <>
      <PageHero compact eyebrow={a.login.eyebrow} title={a.login.title} lead={a.login.lead} crumbs={[{ label: a.login.metaTitle }]} />
      <section className="bg-bone-50 py-12 sm:py-16">
        <div className="container-page">
          <LoginForm a={a.login} />
        </div>
      </section>
    </>
  )
}
