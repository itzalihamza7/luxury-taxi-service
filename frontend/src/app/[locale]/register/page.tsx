import type { Metadata } from 'next'
import { RegisterForm } from '@/components/auth/AuthForms'
import { PageHero } from '@/components/layout/PageHero'
import { getAccount, getLocale } from '@/i18n/server'
import { pageMetadata } from '@/lib/seo'

export async function generateMetadata(): Promise<Metadata> {
  const [locale, a] = await Promise.all([getLocale(), getAccount()])
  return pageMetadata({ locale, path: '/register', title: a.register.metaTitle, description: a.register.lead, noIndex: true })
}

export default async function RegisterPage() {
  const a = await getAccount()
  return (
    <>
      <PageHero compact eyebrow={a.register.eyebrow} title={a.register.title} lead={a.register.lead} crumbs={[{ label: a.register.metaTitle }]} />
      <section className="bg-bone-50 py-12 sm:py-16">
        <div className="container-page">
          <RegisterForm a={a.register} />
        </div>
      </section>
    </>
  )
}
