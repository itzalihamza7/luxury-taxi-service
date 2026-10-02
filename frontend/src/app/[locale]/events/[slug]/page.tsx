import { CalendarDays, Check, MapPin } from 'lucide-react'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { EventCard } from '@/components/content/Cards'
import { CtaBand } from '@/components/layout/CtaBand'
import { PageHero } from '@/components/layout/PageHero'
import { PageSkeleton } from '@/components/layout/PageSkeleton'
import { ButtonLink } from '@/components/ui/Button'
import { Eyebrow, Section, SectionHeading } from '@/components/ui/Section'
import { eventBySlug, events } from '@/content/events'
import { whatsappHref } from '@/content/site'
import { getCommon, getLocale, getPages } from '@/i18n/server'
import { todayInMadrid } from '@/lib/clock'
import { formatDateRange } from '@/lib/format'
import { pageMetadata } from '@/lib/seo'

export function generateStaticParams() {
  return events.map((event) => ({ slug: event.slug }))
}

export async function generateMetadata({ params }: PageProps<'/[locale]/events/[slug]'>): Promise<Metadata> {
  const [{ slug }, locale] = await Promise.all([params, getLocale()])
  const event = eventBySlug(slug)
  if (!event) return {}
  return pageMetadata({ locale, path: `/events/${event.slug}`, title: `${event.title[locale]} · ${event.venue}`, description: event.summary[locale] })
}

/**
 * The address is read inside the Suspense boundary, which lets the router show
 * this page's frame immediately when a visitor follows a link to it.
 */
export default function EventPage({ params }: PageProps<'/[locale]/events/[slug]'>) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <EventContent params={params} />
    </Suspense>
  )
}

async function EventContent({ params }: Pick<PageProps<'/[locale]/events/[slug]'>, 'params'>) {
  const [{ slug }, locale, t, p, today] = await Promise.all([params, getLocale(), getCommon(), getPages(), todayInMadrid()])
  const event = eventBySlug(slug)
  if (!event) notFound()

  const e = p.events
  const ended = event.end < today
  const dates = formatDateRange(event.start, event.end, locale)
  const bookHref = `/booking?to=${event.placeId}`

  return (
    <>
      <PageHero eyebrow={e.kinds[event.kind]} title={event.heading[locale]} lead={event.summary[locale]} crumbs={[{ label: t.nav.events, href: '/events' }, { label: event.title[locale] }]}>
        {ended ? (
          <p className="rounded-full border border-white/15 px-5 py-2.5 text-sm text-bone-100/70">{e.ended}</p>
        ) : (
          <ButtonLink href={bookHref} size="lg" arrow>
            {e.bookFor}
          </ButtonLink>
        )}
        <ButtonLink href={whatsappHref(event.title[locale])} variant="outline-light" size="lg">
          {t.actions.whatsapp}
        </ButtonLink>
      </PageHero>

      <Section tone="light">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:gap-20">
          <div className="reveal space-y-6 text-lg leading-relaxed text-ink-900/75">
            {event.body[locale].map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>

          <aside className="reveal space-y-6">
            <dl className="rounded-md border border-ink-900/10 bg-white p-7">
              <div className="flex items-start gap-4">
                <CalendarDays aria-hidden strokeWidth={1.25} className="mt-1 size-5 shrink-0 text-gold-600" />
                <div>
                  <dt className="eyebrow text-ink-900/60">{e.when}</dt>
                  <dd className="mt-1.5 font-display text-2xl">
                    <time dateTime={event.start}>{dates}</time>
                  </dd>
                </div>
              </div>
              <div className="mt-6 flex items-start gap-4 border-t border-ink-900/10 pt-6">
                <MapPin aria-hidden strokeWidth={1.25} className="mt-1 size-5 shrink-0 text-gold-600" />
                <div>
                  <dt className="eyebrow text-ink-900/60">{e.where}</dt>
                  <dd className="mt-1.5 font-display text-2xl">{event.venue}</dd>
                </div>
              </div>
            </dl>

            <div className="rounded-md bg-bone-100 p-7">
              <Eyebrow>{e.tipsTitle}</Eyebrow>
              <ul className="mt-5 space-y-3.5">
                {event.tips[locale].map((tip) => (
                  <li key={tip} className="flex items-start gap-3 text-[0.9375rem] leading-relaxed">
                    <Check aria-hidden className="mt-1 size-4 shrink-0 text-gold-600" />
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
            <p className="text-xs leading-relaxed text-ink-900/60">{e.disclaimer}</p>
          </aside>
        </div>
      </Section>

      <Section tone="bone">
        <SectionHeading eyebrow={e.eyebrow} title={e.otherTitle} />
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {events
            .filter((other) => other.slug !== event.slug)
            .map((other) => (
              <li key={other.slug} className="reveal">
                <EventCard event={other} locale={locale} p={p} ended={other.end < today} />
              </li>
            ))}
        </ul>
      </Section>

      <CtaBand />
    </>
  )
}
