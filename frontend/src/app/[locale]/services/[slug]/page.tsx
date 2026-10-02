import { Check } from 'lucide-react'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { ServiceCard } from '@/components/content/Cards'
import { faqJsonLd, FaqList } from '@/components/content/FaqList'
import { JsonLd } from '@/components/content/JsonLd'
import { FleetGrid } from '@/components/fleet/FleetGrid'
import { CtaBand } from '@/components/layout/CtaBand'
import { PageHero } from '@/components/layout/PageHero'
import { PageSkeleton } from '@/components/layout/PageSkeleton'
import { ButtonLink } from '@/components/ui/Button'
import { Eyebrow, Section, SectionHeading } from '@/components/ui/Section'
import { serviceBySlug, services } from '@/content/services'
import { whatsappHref } from '@/content/site'
import { getCommon, getLocale, getPages } from '@/i18n/server'
import { pageMetadata } from '@/lib/seo'

export function generateStaticParams() {
  return services.map((service) => ({ slug: service.slug }))
}

export async function generateMetadata({ params }: PageProps<'/[locale]/services/[slug]'>): Promise<Metadata> {
  const [{ slug }, locale] = await Promise.all([params, getLocale()])
  const service = serviceBySlug(slug)
  if (!service) return {}
  return pageMetadata({ locale, path: `/services/${service.slug}`, title: service.title[locale], description: service.summary[locale] })
}

/**
 * The address is read inside the Suspense boundary, which lets the router show
 * this page's frame immediately when a visitor follows a link to it.
 */
export default function ServicePage({ params }: PageProps<'/[locale]/services/[slug]'>) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ServiceContent params={params} />
    </Suspense>
  )
}

async function ServiceContent({ params }: Pick<PageProps<'/[locale]/services/[slug]'>, 'params'>) {
  const [{ slug }, locale, t, p] = await Promise.all([params, getLocale(), getCommon(), getPages()])
  const service = serviceBySlug(slug)
  if (!service) notFound()

  const s = p.services
  const bookHref = `/booking?type=${service.rideType}`
  const questions = service.faqs.map((faq) => ({ question: faq.question[locale], answer: faq.answer[locale] }))

  return (
    <>
      <JsonLd data={faqJsonLd(questions)} />
      <PageHero
        eyebrow={service.title[locale]}
        title={service.heading[locale]}
        lead={service.summary[locale]}
        crumbs={[{ label: t.nav.services, href: '/services' }, { label: service.title[locale] }]}
      >
        <ButtonLink href={bookHref} size="lg" arrow>
          {s.bookThis}
        </ButtonLink>
        <ButtonLink href={whatsappHref(service.title[locale])} variant="outline-light" size="lg">
          {t.actions.whatsapp}
        </ButtonLink>
      </PageHero>

      <Section tone="light">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:gap-20">
          <div className="reveal space-y-6 text-lg leading-relaxed text-ink-900/75">
            {service.intro[locale].map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
            <div className="pt-4">
              <ButtonLink href={bookHref} variant="dark" size="lg" arrow>
                {t.actions.getPrice}
              </ButtonLink>
            </div>
          </div>

          <div className="reveal space-y-8">
            <div className="rounded-md border border-ink-900/10 bg-white p-7">
              <Eyebrow>{s.includesTitle}</Eyebrow>
              <ul className="mt-5 space-y-3.5">
                {service.includes[locale].map((item) => (
                  <li key={item} className="flex items-start gap-3 text-[0.9375rem] leading-relaxed">
                    <Check aria-hidden className="mt-1 size-4 shrink-0 text-gold-600" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-md bg-bone-100 p-7">
              <Eyebrow>{s.idealTitle}</Eyebrow>
              <ul className="mt-5 space-y-3 text-[0.9375rem] leading-relaxed text-ink-900/75">
                {service.idealFor[locale].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <span aria-hidden className="mt-2.5 size-1 shrink-0 rounded-full bg-gold-600" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </Section>

      <Section tone="dark">
        <SectionHeading eyebrow={s.vehiclesEyebrow} title={s.vehiclesTitle} onDark>
          <ButtonLink href="/fleet" variant="outline-light" arrow>
            {t.actions.viewFleet}
          </ButtonLink>
        </SectionHeading>
        <FleetGrid slugs={service.vehicles} />
      </Section>

      <Section tone="light">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-20">
          <SectionHeading eyebrow={s.faqEyebrow} title={s.faqTitle} />
          <FaqList items={questions} />
        </div>
      </Section>

      <Section tone="bone">
        <SectionHeading eyebrow={s.otherEyebrow} title={s.otherTitle} />
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {services
            .filter((other) => other.slug !== service.slug)
            .map((other) => (
              <li key={other.slug} className="reveal">
                <ServiceCard service={other} locale={locale} t={t} />
              </li>
            ))}
        </ul>
      </Section>

      <CtaBand />
    </>
  )
}
