import type { Metadata } from 'next'
import { Suspense } from 'react'
import { CardGridSkeleton, EventCard } from '@/components/content/Cards'
import { CtaBand } from '@/components/layout/CtaBand'
import { PageHero } from '@/components/layout/PageHero'
import { ButtonLink } from '@/components/ui/Button'
import { Eyebrow, Section } from '@/components/ui/Section'
import { getCommon, getLocale, getPages } from '@/i18n/server'
import { todayInMadrid } from '@/lib/clock'
import { pageMetadata } from '@/lib/seo'
import { loadCollection } from '@/lib/server-api'

export async function generateMetadata(): Promise<Metadata> {
  const [locale, p] = await Promise.all([getLocale(), getPages()])
  return pageMetadata({ locale, path: '/events', title: p.events.metaTitle, description: p.events.metaDescription })
}

const grid = 'grid gap-5 sm:grid-cols-2 lg:grid-cols-3'

export default async function EventsPage() {
  const [t, p] = await Promise.all([getCommon(), getPages()])
  const e = p.events

  return (
    <>
      <PageHero eyebrow={e.eyebrow} title={e.title} lead={e.lead} crumbs={[{ label: t.nav.events }]}>
        <ButtonLink href="/booking" size="lg" arrow>
          {t.actions.book}
        </ButtonLink>
      </PageHero>

      <Section tone="bone">
        <Suspense fallback={<CardGridSkeleton count={3} className={grid} />}>
          <EventLists />
        </Suspense>
        <p className="mt-12 max-w-3xl text-xs leading-relaxed text-ink-900/60">{e.disclaimer}</p>
      </Section>

      <CtaBand />
    </>
  )
}

async function EventLists() {
  const [events, locale, p, today] = await Promise.all([loadCollection('event'), getLocale(), getPages(), todayInMadrid()])
  const e = p.events

  // Upcoming first, soonest at the top; finished editions move to their own list.
  const upcoming = events.filter((event) => event.end >= today).sort((a, b) => a.start.localeCompare(b.start))
  const past = events.filter((event) => event.end < today).sort((a, b) => b.start.localeCompare(a.start))

  return (
    <>
        {upcoming.length > 0 ? (
          <>
            <Eyebrow>{e.upcoming}</Eyebrow>
            <ul className={`mt-8 ${grid}`}>
              {upcoming.map((event) => (
                <li key={event.slug} className="reveal">
                  <EventCard event={event} locale={locale} p={p} />
                </li>
              ))}
            </ul>
          </>
        ) : null}

        {past.length > 0 ? (
          <div className={upcoming.length > 0 ? 'mt-20' : ''}>
            <Eyebrow>{e.past}</Eyebrow>
            <ul className={`mt-8 ${grid}`}>
              {past.map((event) => (
                <li key={event.slug}>
                  <EventCard event={event} locale={locale} p={p} ended />
                </li>
              ))}
            </ul>
          </div>
        ) : null}
    </>
  )
}
