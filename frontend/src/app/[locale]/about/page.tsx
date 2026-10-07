import type { Metadata } from 'next'
import { Suspense } from 'react'
import { VehicleArt } from '@/components/art/VehicleArt'
import { CardGridSkeleton, ServiceCard } from '@/components/content/Cards'
import { WhatsAppButton } from '@/components/layout/ContactButtons'
import { CtaBand } from '@/components/layout/CtaBand'
import { PageHero } from '@/components/layout/PageHero'
import { ButtonLink } from '@/components/ui/Button'
import { Accent, Eyebrow, Section, SectionHeading } from '@/components/ui/Section'
import { getCommon, getLocale, getPages } from '@/i18n/server'
import { pageMetadata } from '@/lib/seo'
import { loadCollection } from '@/lib/server-api'

export async function generateMetadata(): Promise<Metadata> {
  const [locale, p] = await Promise.all([getLocale(), getPages()])
  return pageMetadata({ locale, path: '/about', title: p.about.metaTitle, description: p.about.metaDescription })
}

const grid = 'grid gap-5 sm:grid-cols-2 lg:grid-cols-3'

async function FirstServices() {
  const [services, locale, t] = await Promise.all([loadCollection('service'), getLocale(), getCommon()])
  return (
    <ul className={grid}>
      {services.slice(0, 3).map((service) => (
        <li key={service.slug} className="reveal">
          <ServiceCard service={service} locale={locale} t={t} />
        </li>
      ))}
    </ul>
  )
}

export default async function AboutPage() {
  const [t, p] = await Promise.all([getCommon(), getPages()])
  const a = p.about

  return (
    <>
      <PageHero eyebrow={a.eyebrow} title={a.title} lead={a.lead} crumbs={[{ label: t.nav.about }]}>
        <ButtonLink href="/booking" size="lg" arrow>
          {t.actions.book}
        </ButtonLink>
        <WhatsAppButton />
      </PageHero>

      <Section tone="light">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-20">
          <div className="reveal">
            <Eyebrow>{a.storyEyebrow}</Eyebrow>
            <h2 className="display mt-5 text-4xl sm:text-5xl lg:text-[3.5rem]">
              <Accent text={a.storyTitle} />
            </h2>
            <VehicleArt bodyType="limousine" className="mt-12 hidden w-full max-w-md text-ink-900/70 lg:block" />
          </div>
          <div className="reveal space-y-6 text-lg leading-relaxed text-ink-900/75">
            {a.story.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        </div>
      </Section>

      <Section tone="dark">
        <SectionHeading eyebrow={a.valuesEyebrow} title={a.valuesTitle} onDark />
        <ol className="grid gap-px overflow-hidden rounded-md border border-white/10 bg-white/10 lg:grid-cols-3">
          {a.values.map((value, index) => (
            <li key={value.title} className="reveal bg-ink-950 p-8 sm:p-10">
              <span className="font-display text-5xl text-gold-300/80">{String(index + 1).padStart(2, '0')}</span>
              <h3 className="mt-6 font-display text-3xl text-bone-50">{value.title}</h3>
              <p className="mt-3 text-[0.9375rem] leading-relaxed text-bone-100/65">{value.text}</p>
            </li>
          ))}
        </ol>

        <dl className="mt-16 grid gap-8 border-t border-white/10 pt-12 sm:grid-cols-3">
          {p.home.facts.map((fact) => (
            <div key={fact.label} className="reveal">
              <dd className="font-display text-6xl text-gold-300">{fact.value}</dd>
              <dt className="mt-3 max-w-xs text-[0.9375rem] leading-relaxed text-bone-100/65">{fact.label}</dt>
            </div>
          ))}
        </dl>
      </Section>

      <Section tone="bone">
        <SectionHeading eyebrow={p.home.servicesEyebrow} title={p.home.servicesTitle}>
          <ButtonLink href="/services" variant="outline" arrow>
            {t.nav.allServices}
          </ButtonLink>
        </SectionHeading>
        <Suspense fallback={<CardGridSkeleton count={3} className={grid} />}>
          <FirstServices />
        </Suspense>
      </Section>

      <CtaBand />
    </>
  )
}
