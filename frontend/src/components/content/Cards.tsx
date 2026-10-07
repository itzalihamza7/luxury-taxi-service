import { ArrowRight, Building2, Clock, Map, Plane, Route as RouteIcon, type LucideIcon } from 'lucide-react'
import { Link } from '@/components/ui/Link'
import { fill, type Locale } from '@/i18n/config'
import type { CommonMessages } from '@/i18n/messages/common'
import type { PageMessages } from '@/i18n/messages/pages'
import { formatDate, formatDateRange } from '@/lib/format'
import type { Article, EventGuide, RouteGuide, Service } from '@/lib/types'

const SERVICE_ICONS: Record<Service['icon'], LucideIcon> = {
  plane: Plane,
  clock: Clock,
  city: Building2,
  route: RouteIcon,
  map: Map,
}

export function ServiceIcon({ name, className = 'size-6' }: { name: Service['icon']; className?: string }) {
  const Icon = SERVICE_ICONS[name]
  return <Icon aria-hidden strokeWidth={1.25} className={className} />
}

/** "Explore ->" affordance shared by the cards. */
function More({ label }: { label: string }) {
  return (
    <span className="mt-auto inline-flex items-center gap-2 pt-6 text-sm font-medium text-ink-900">
      {label}
      <ArrowRight aria-hidden className="size-4 transition-transform duration-300 ease-out-expo group-hover:translate-x-1" />
    </span>
  )
}

const card =
  'group relative flex h-full flex-col rounded-md border border-ink-900/10 bg-white p-7 transition-all duration-500 ease-out-expo hover:-translate-y-1 hover:border-gold-500/50 hover:shadow-[0_24px_48px_-24px_rgba(13,15,19,0.25)] sm:p-8'

export function ServiceCard({ service, locale, t }: { service: Service; locale: Locale; t: CommonMessages }) {
  return (
    <Link href={`/services/${service.slug}`} prefetch className={card}>
      <span className="flex size-12 items-center justify-center rounded-full bg-ink-950 text-gold-300">
        <ServiceIcon name={service.icon} className="size-5" />
      </span>
      <h3 className="display mt-6 text-2xl sm:text-[1.75rem]">{service.title[locale]}</h3>
      <p className="mt-3 text-[0.9375rem] leading-relaxed text-ink-900/65">{service.summary[locale]}</p>
      <More label={t.actions.explore} />
    </Link>
  )
}

export function RouteCard({ route, locale, t }: { route: RouteGuide; locale: Locale; t: CommonMessages }) {
  return (
    <Link href={`/routes/${route.slug}`} prefetch className={card}>
      {/* A simple line from Madrid to the destination */}
      <div aria-hidden className="flex items-center gap-3 text-gold-600">
        <span className="size-2 rounded-full border border-current" />
        <span className="h-px flex-1 bg-gradient-to-r from-gold-600/60 via-gold-600/25 to-gold-600/60" />
        <span className="size-2 rounded-full bg-current" />
      </div>
      <div className="mt-2 flex justify-between text-[0.6875rem] font-medium tracking-[0.16em] text-ink-900/60 uppercase">
        <span>Madrid</span>
        <span>{route.city[locale]}</span>
      </div>

      <h3 className="display mt-6 text-3xl">{route.city[locale]}</h3>
      <p className="mt-2 text-sm font-medium text-gold-700">
        {fill(t.units.km, { value: route.km })} · {fill(t.units.minutes, { value: route.minutes })} · {route.road}
      </p>
      <p className="mt-3 text-[0.9375rem] leading-relaxed text-ink-900/65">{route.summary[locale]}</p>
      <More label={t.actions.explore} />
    </Link>
  )
}

export function ArticleCard({ article, locale, t, p }: { article: Article; locale: Locale; t: CommonMessages; p: PageMessages }) {
  return (
    <Link href={`/journal/${article.slug}`} prefetch className={card}>
      <p className="eyebrow text-gold-700">{article.category[locale]}</p>
      <h3 className="display mt-4 text-2xl leading-tight sm:text-[1.75rem]">{article.title[locale]}</h3>
      <p className="mt-3 text-[0.9375rem] leading-relaxed text-ink-900/65">{article.excerpt[locale]}</p>
      <p className="mt-5 text-xs text-ink-900/60">
        <time dateTime={article.date}>{formatDate(article.date, locale)}</time> · {fill(p.journal.minutes, { count: article.minutes })}
      </p>
      <More label={t.actions.readArticle} />
    </Link>
  )
}

export function EventCard({ event, locale, p, ended }: { event: EventGuide; locale: Locale; p: PageMessages; ended?: boolean }) {
  return (
    <Link href={`/events/${event.slug}`} prefetch className={`${card} ${ended ? 'opacity-70' : ''}`}>
      <div className="flex items-center justify-between gap-4">
        <p className="eyebrow text-gold-700">{event.category[locale]}</p>
        {ended ? <span className="rounded-full bg-ink-900/5 px-3 py-1 text-xs text-ink-900/60">{p.events.past}</span> : null}
      </div>
      <h3 className="display mt-4 text-3xl">{event.title[locale]}</h3>
      <p className="mt-2 text-sm font-medium text-ink-900">
        <time dateTime={event.start}>{formatDateRange(event.start, event.end, locale)}</time>
      </p>
      <p className="text-sm text-ink-900/60">{event.venue}</p>
      <p className="mt-4 text-[0.9375rem] leading-relaxed text-ink-900/65">{event.summary[locale]}</p>
      <More label={p.events.details} />
    </Link>
  )
}

/** Placeholders with the footprint of the cards, shown while a list loads. */
export function CardGridSkeleton({ count, className }: { count: number; className: string }) {
  return (
    <div aria-hidden className={className}>
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="h-64 animate-pulse rounded-md border border-ink-900/10 bg-white/70" />
      ))}
    </div>
  )
}
