import type { Metadata } from 'next'
import { ServiceCard } from '@/components/content/Cards'
import { CtaBand } from '@/components/layout/CtaBand'
import { PageHero } from '@/components/layout/PageHero'
import { ButtonLink } from '@/components/ui/Button'
import { Section } from '@/components/ui/Section'
import { services } from '@/content/services'
import { whatsappHref } from '@/content/site'
import { getCommon, getLocale, getPages } from '@/i18n/server'
import { pageMetadata } from '@/lib/seo'

export async function generateMetadata(): Promise<Metadata> {
  const [locale, p] = await Promise.all([getLocale(), getPages()])
  return pageMetadata({ locale, path: '/services', title: p.services.metaTitle, description: p.services.metaDescription })
}

export default async function ServicesPage() {
  const [locale, t, p] = await Promise.all([getLocale(), getCommon(), getPages()])
  return (
    <>
      <PageHero eyebrow={p.services.eyebrow} title={p.services.title} lead={p.services.lead} crumbs={[{ label: t.nav.services }]}>
        <ButtonLink href="/booking" size="lg" arrow>
          {t.actions.getPrice}
        </ButtonLink>
        <ButtonLink href={whatsappHref()} variant="outline-light" size="lg">
          {t.actions.whatsapp}
        </ButtonLink>
      </PageHero>

      <Section tone="bone">
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => (
            <li key={service.slug} className="reveal">
              <ServiceCard service={service} locale={locale} t={t} />
            </li>
          ))}
        </ul>
      </Section>

      <CtaBand />
    </>
  )
}
