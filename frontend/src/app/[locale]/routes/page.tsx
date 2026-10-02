import type { Metadata } from 'next'
import { RouteCard } from '@/components/content/Cards'
import { CtaBand } from '@/components/layout/CtaBand'
import { PageHero } from '@/components/layout/PageHero'
import { ButtonLink } from '@/components/ui/Button'
import { Section } from '@/components/ui/Section'
import { routes } from '@/content/routes'
import { whatsappHref } from '@/content/site'
import { getCommon, getLocale, getPages } from '@/i18n/server'
import { pageMetadata } from '@/lib/seo'

export async function generateMetadata(): Promise<Metadata> {
  const [locale, p] = await Promise.all([getLocale(), getPages()])
  return pageMetadata({ locale, path: '/routes', title: p.routes.metaTitle, description: p.routes.metaDescription })
}

export default async function RoutesPage() {
  const [locale, t, p] = await Promise.all([getLocale(), getCommon(), getPages()])
  return (
    <>
      <PageHero eyebrow={p.routes.eyebrow} title={p.routes.title} lead={p.routes.lead} crumbs={[{ label: t.nav.routes }]}>
        <ButtonLink href="/booking?type=city_to_city" size="lg" arrow>
          {t.actions.getPrice}
        </ButtonLink>
        <ButtonLink href={whatsappHref()} variant="outline-light" size="lg">
          {t.actions.whatsapp}
        </ButtonLink>
      </PageHero>

      <Section tone="bone">
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {routes.map((route) => (
            <li key={route.slug} className="reveal">
              <RouteCard route={route} locale={locale} t={t} />
            </li>
          ))}
        </ul>
      </Section>

      <CtaBand />
    </>
  )
}
