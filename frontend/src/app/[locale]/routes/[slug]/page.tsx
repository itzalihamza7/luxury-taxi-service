import { Car, Check, TrainFront } from 'lucide-react'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { RouteCard } from '@/components/content/Cards'
import { faqJsonLd, FaqList } from '@/components/content/FaqList'
import { JsonLd } from '@/components/content/JsonLd'
import { FleetGrid } from '@/components/fleet/FleetGrid'
import { CtaBand } from '@/components/layout/CtaBand'
import { PageHero } from '@/components/layout/PageHero'
import { PageSkeleton } from '@/components/layout/PageSkeleton'
import { ButtonLink } from '@/components/ui/Button'
import { Eyebrow, Section, SectionHeading } from '@/components/ui/Section'
import { routeBySlug, routes } from '@/content/routes'
import { whatsappHref } from '@/content/site'
import { fill } from '@/i18n/config'
import { getCommon, getLocale, getPages } from '@/i18n/server'
import { pageMetadata } from '@/lib/seo'

export function generateStaticParams() {
  return routes.map((route) => ({ slug: route.slug }))
}

export async function generateMetadata({ params }: PageProps<'/[locale]/routes/[slug]'>): Promise<Metadata> {
  const [{ slug }, locale] = await Promise.all([params, getLocale()])
  const route = routeBySlug(slug)
  if (!route) return {}
  return pageMetadata({ locale, path: `/routes/${route.slug}`, title: `Madrid – ${route.city[locale]}`, description: route.summary[locale] })
}

/**
 * The address is read inside the Suspense boundary, which lets the router show
 * this page's frame immediately when a visitor follows a link to it.
 */
export default function RoutePage({ params }: PageProps<'/[locale]/routes/[slug]'>) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <RouteContent params={params} />
    </Suspense>
  )
}

async function RouteContent({ params }: Pick<PageProps<'/[locale]/routes/[slug]'>, 'params'>) {
  const [{ slug }, locale, t, p] = await Promise.all([params, getLocale(), getCommon(), getPages()])
  const route = routeBySlug(slug)
  if (!route) notFound()

  const r = p.routes
  // Opens the booking form with Madrid -> destination already filled in.
  const bookHref = `/booking?type=city_to_city&from=cat:madrid&to=${route.destinationId}`
  const questions = route.faqs.map((faq) => ({ question: faq.question[locale], answer: faq.answer[locale] }))
  const facts = [
    { label: r.distance, value: fill(t.units.km, { value: route.km }) },
    { label: r.duration, value: `${t.units.approx} ${fill(t.units.minutes, { value: route.minutes })}` },
    { label: r.road, value: route.road },
  ]

  return (
    <>
      <JsonLd data={faqJsonLd(questions)} />
      <PageHero eyebrow={`Madrid — ${route.city[locale]}`} title={route.heading[locale]} lead={route.intro[locale]} crumbs={[{ label: t.nav.routes, href: '/routes' }, { label: route.city[locale] }]}>
        <ButtonLink href={bookHref} size="lg" arrow>
          {r.seePrice}
        </ButtonLink>
        <ButtonLink href={whatsappHref(`Madrid – ${route.city[locale]}`)} variant="outline-light" size="lg">
          {t.actions.whatsapp}
        </ButtonLink>
      </PageHero>

      {/* Journey at a glance */}
      <section className="on-dark bg-ink-950 pb-16 text-bone-100">
        <div className="container-page">
          <dl className="grid gap-px overflow-hidden rounded-md border border-white/10 bg-white/10 sm:grid-cols-3">
            {facts.map((fact) => (
              <div key={fact.label} className="bg-ink-950 p-6">
                <dt className="eyebrow text-bone-100/55">{fact.label}</dt>
                <dd className="mt-3 font-display text-4xl text-bone-50">{fact.value}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-xs text-bone-100/55">{r.fromMadrid}</p>
        </div>
      </section>

      <Section tone="light">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:gap-20">
          <div className="reveal">
            <Eyebrow>{r.journeyTitle}</Eyebrow>
            <div className="mt-6 space-y-6 text-lg leading-relaxed text-ink-900/75">
              {route.journey[locale].map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </div>
          <div className="reveal rounded-md bg-bone-100 p-7 sm:p-9">
            <Eyebrow>{r.highlightsTitle}</Eyebrow>
            <ul className="mt-6 space-y-4">
              {route.highlights[locale].map((highlight) => (
                <li key={highlight} className="flex items-start gap-3 text-[0.9375rem] leading-relaxed">
                  <Check aria-hidden className="mt-1 size-4 shrink-0 text-gold-600" />
                  {highlight}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      {/* Car or train */}
      <Section tone="bone">
        <SectionHeading eyebrow={r.verdictEyebrow} title={r.verdictTitle} />
        <div className="grid gap-5 lg:grid-cols-2">
          <article className="reveal rounded-md border border-ink-900/10 bg-white p-7 sm:p-9">
            <TrainFront aria-hidden strokeWidth={1.25} className="size-8 text-ink-900/60" />
            <h3 className="mt-5 font-display text-2xl">{r.trainTitle}</h3>
            <p className="mt-3 text-[0.9375rem] leading-relaxed text-ink-900/70">{route.train[locale]}</p>
          </article>
          <article className="on-dark grain reveal rounded-md bg-ink-950 p-7 text-bone-100 sm:p-9">
            <Car aria-hidden strokeWidth={1.25} className="size-8 text-gold-300" />
            <h3 className="mt-5 font-display text-2xl text-bone-50">{r.carTitle}</h3>
            <p className="mt-3 text-[0.9375rem] leading-relaxed text-bone-100/70">{route.car[locale]}</p>
            <ButtonLink href={bookHref} arrow className="mt-7">
              {r.seePrice}
            </ButtonLink>
          </article>
        </div>
      </Section>

      <Section tone="dark">
        <SectionHeading eyebrow={r.vehiclesEyebrow} title={r.vehiclesTitle} onDark />
        <FleetGrid slugs={route.vehicles} />
      </Section>

      <Section tone="light">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-20">
          <SectionHeading eyebrow={r.faqEyebrow} title={fill(r.faqTitle, { city: route.city[locale] })} />
          <FaqList items={questions} />
        </div>
      </Section>

      <Section tone="bone">
        <SectionHeading eyebrow={r.otherEyebrow} title={r.otherTitle} />
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {routes
            .filter((other) => other.slug !== route.slug)
            .map((other) => (
              <li key={other.slug} className="reveal">
                <RouteCard route={other} locale={locale} t={t} />
              </li>
            ))}
        </ul>
      </Section>

      <CtaBand />
    </>
  )
}
