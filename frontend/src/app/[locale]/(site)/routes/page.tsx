import type { Metadata } from 'next'
import { Suspense } from 'react'
import { CardGridSkeleton, RouteCard } from '@/components/content/Cards'
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
  return pageMetadata({ locale, path: '/routes', title: p.routes.metaTitle, description: p.routes.metaDescription })
}

const grid = 'grid gap-5 sm:grid-cols-2 lg:grid-cols-4'

async function RouteList() {
  const [routes, locale, t] = await Promise.all([loadCollection('route'), getLocale(), getCommon()])
  return (
    <ul className={grid}>
      {routes.map((route) => (
        <li key={route.slug} className="reveal">
          <RouteCard route={route} locale={locale} t={t} />
        </li>
      ))}
    </ul>
  )
}

export default async function RoutesPage() {
  const [t, p] = await Promise.all([getCommon(), getPages()])
  return (
    <>
      <PageHero eyebrow={p.routes.eyebrow} title={p.routes.title} lead={p.routes.lead} crumbs={[{ label: t.nav.routes }]} image="/images/services/intercity.jpg">
        <ButtonLink href="/booking?type=city_to_city" size="lg" arrow>
          {t.actions.getPrice}
        </ButtonLink>
        <WhatsAppButton />
      </PageHero>

      <Section tone="bone">
        <Suspense fallback={<CardGridSkeleton count={4} className={grid} />}>
          <RouteList />
        </Suspense>
      </Section>

      <CtaBand />
    </>
  )
}
