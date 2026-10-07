import { ArrowRight, Building2, Clock, Map, Plane, Route as RouteIcon, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from '@/components/ui/Link'
import { Photo } from '@/components/ui/Photo'
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
  'group relative flex h-full flex-col overflow-hidden rounded-xl border border-ink-900/10 bg-white transition-all duration-500 ease-out-expo hover:-translate-y-1 hover:border-gold-500/50 hover:shadow-[0_28px_56px_-28px_rgba(12,18,27,0.3)]'
const body = 'flex flex-1 flex-col p-7 sm:p-8'
const SIZES = '(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw'

/**
 * The picture at the top of a card, which zooms slightly when the card is
 * hovered. Cards work without one: entries the operator adds may not have a
 * picture yet.
 */
function Picture({ src, children }: { src: string; children?: ReactNode }) {
  return (
    <div className="relative aspect-[16/10] overflow-hidden bg-ink-900">
      <Photo src={src} alt="" sizes={SIZES} className="transition-transform duration-[1400ms] ease-out-expo group-hover:scale-[1.045]" />
      {children}
    </div>
  )
}

export function ServiceCard({ service, locale, t }: { service: Service; locale: Locale; t: CommonMessages }) {
  const icon = (
    <span className="flex size-12 items-center justify-center rounded-full bg-ink-950 text-gold-300 ring-4 ring-white">
      <ServiceIcon name={service.icon} className="size-5" />
    </span>
  )
  return (
    <Link href={`/services/${service.slug}`} prefetch className={card}>
      {service.image ? <Picture src={service.image} /> : null}
      <div className={body}>
        {/* Over a picture, the icon sits on its lower edge. */}
        {service.image ? <div className="relative z-10 -mt-13 mb-5 self-start">{icon}</div> : <div className="mb-6 self-start">{icon}</div>}
        <h3 className="display text-2xl sm:text-[1.75rem]">{service.title[locale]}</h3>
        <p className="mt-3 text-[0.9375rem] leading-relaxed text-ink-900/65">{service.summary[locale]}</p>
        <More label={t.actions.explore} />
      </div>
    </Link>
  )
}

export function RouteCard({ route, locale, t }: { route: RouteGuide; locale: Locale; t: CommonMessages }) {
  const facts = `${fill(t.units.km, { value: route.km })} · ${fill(t.units.minutes, { value: route.minutes })} · ${route.road}`
  return (
    <Link href={`/routes/${route.slug}`} prefetch className={card}>
      {route.image ? (
        <Picture src={route.image}>
          <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-ink-950/85 via-ink-950/15 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-6 text-bone-50">
            <p className="eyebrow text-gold-300">Madrid →</p>
            <h3 className="display mt-1.5 text-3xl">{route.city[locale]}</h3>
          </div>
        </Picture>
      ) : null}
      <div className={body}>
        {route.image ? null : (
          <>
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
          </>
        )}
        <p className={`text-sm font-medium text-gold-700 ${route.image ? '' : 'mt-2'}`}>{facts}</p>
        <p className="mt-3 text-[0.9375rem] leading-relaxed text-ink-900/65">{route.summary[locale]}</p>
        <More label={t.actions.explore} />
      </div>
    </Link>
  )
}

export function ArticleCard({ article, locale, t, p }: { article: Article; locale: Locale; t: CommonMessages; p: PageMessages }) {
  return (
    <Link href={`/journal/${article.slug}`} prefetch className={card}>
      {article.image ? <Picture src={article.image} /> : null}
      <div className={body}>
        <p className="eyebrow text-gold-700">{article.category[locale]}</p>
        <h3 className="display mt-4 text-2xl leading-tight sm:text-[1.75rem]">{article.title[locale]}</h3>
        <p className="mt-3 text-[0.9375rem] leading-relaxed text-ink-900/65">{article.excerpt[locale]}</p>
        <p className="mt-5 text-xs text-ink-900/60">
          <time dateTime={article.date}>{formatDate(article.date, locale)}</time> · {fill(p.journal.minutes, { count: article.minutes })}
        </p>
        <More label={t.actions.readArticle} />
      </div>
    </Link>
  )
}

export function EventCard({ event, locale, p, ended }: { event: EventGuide; locale: Locale; p: PageMessages; ended?: boolean }) {
  return (
    <Link href={`/events/${event.slug}`} prefetch className={`${card} ${ended ? 'opacity-70' : ''}`}>
      {event.image ? <Picture src={event.image} /> : null}
      <div className={body}>
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
      </div>
    </Link>
  )
}

/** Placeholders with the footprint of the cards, shown while a list loads. */
export function CardGridSkeleton({ count, className }: { count: number; className: string }) {
  return (
    <div aria-hidden className={className}>
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="h-96 animate-pulse rounded-xl border border-ink-900/10 bg-white/70" />
      ))}
    </div>
  )
}
