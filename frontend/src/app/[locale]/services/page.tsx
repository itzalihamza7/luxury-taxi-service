import type { Metadata } from 'next'
import { Suspense } from 'react'
import { CardGridSkeleton, ServiceCard } from '@/components/content/Cards'
import { WhatsAppButton } from '@/components/layout/ContactButtons'
import { CtaBand } from '@/components/layout/CtaBand'
import { PageHero } from '@/components/layout/PageHero'
import { ButtonLink } from '@/components/ui/Button'
import { Section } from '@/components/ui/Section'
import { getCommon, getLocale, getPages } from '@/i18n/server'
import { pageMetadata } from '@/lib/seo'
import { loadCollection } from '@/lib/server-api'

export async function generateMetadata(): Promise<Metadata> {
  const [locale, p] = await Promise.all([getLocale(), getPages()])
  return pageMetadata({ locale, path: '/services', title: p.services.metaTitle, description: p.services.metaDescription })
}

const grid = 'grid gap-5 sm:grid-cols-2 lg:grid-cols-3'

async function ServiceList() {
  const [services, locale, t] = await Promise.all([loadCollection('service'), getLocale(), getCommon()])
  return (
    <ul className={grid}>
      {services.map((service) => (
        <li key={service.slug} className="reveal">
          <ServiceCard service={service} locale={locale} t={t} />
        </li>
      ))}
    </ul>
  )
}

export default async function ServicesPage() {
  const [t, p] = await Promise.all([getCommon(), getPages()])
  return (
    <>
      <PageHero eyebrow={p.services.eyebrow} title={p.services.title} lead={p.services.lead} crumbs={[{ label: t.nav.services }]}>
        <ButtonLink href="/booking" size="lg" arrow>
          {t.actions.getPrice}
        </ButtonLink>
        <WhatsAppButton />
      </PageHero>

      <Section tone="bone">
        <Suspense fallback={<CardGridSkeleton count={6} className={grid} />}>
          <ServiceList />
        </Suspense>
      </Section>

      <CtaBand />
    </>
  )
}
