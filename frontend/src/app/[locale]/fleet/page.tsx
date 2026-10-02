import { Check } from 'lucide-react'
import type { Metadata } from 'next'
import { FleetGrid } from '@/components/fleet/FleetGrid'
import { CtaBand } from '@/components/layout/CtaBand'
import { PageHero } from '@/components/layout/PageHero'
import { ButtonLink } from '@/components/ui/Button'
import { Section, SectionHeading } from '@/components/ui/Section'
import { getCommon, getLocale, getPages } from '@/i18n/server'
import { pageMetadata } from '@/lib/seo'

export async function generateMetadata(): Promise<Metadata> {
  const [locale, p] = await Promise.all([getLocale(), getPages()])
  return pageMetadata({ locale, path: '/fleet', title: p.fleet.metaTitle, description: p.fleet.metaDescription })
}

export default async function FleetPage() {
  const [t, p] = await Promise.all([getCommon(), getPages()])
  return (
    <>
      <PageHero eyebrow={p.fleet.eyebrow} title={p.fleet.title} lead={p.fleet.lead} crumbs={[{ label: t.nav.fleet }]}>
        <ButtonLink href="/booking" size="lg" arrow>
          {t.actions.getPrice}
        </ButtonLink>
      </PageHero>

      <section className="on-dark grain bg-ink-950 pb-24 text-bone-100 sm:pb-32">
        <div className="container-page">
          <FleetGrid />
          <p className="mt-8 text-sm text-bone-100/55">{p.fleet.priceNote}</p>
        </div>
      </section>

      <Section tone="light">
        <SectionHeading eyebrow={p.home.includedEyebrow} title={p.home.includedTitle} />
        <ul className="grid gap-x-10 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
          {p.home.included.map((item) => (
            <li key={item.title} className="reveal flex items-start gap-4 border-t border-ink-900/10 pt-6">
              <Check aria-hidden className="mt-1 size-5 shrink-0 text-gold-600" />
              <div>
                <h3 className="font-display text-xl">{item.title}</h3>
                <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-ink-900/65">{item.text}</p>
              </div>
            </li>
          ))}
        </ul>
      </Section>

      <CtaBand />
    </>
  )
}
