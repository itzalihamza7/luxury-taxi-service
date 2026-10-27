import { ChevronRight } from 'lucide-react'
import type { ReactNode } from 'react'
import { Backdrop } from '@/components/art/Backdrop'
import { JsonLd } from '@/components/content/JsonLd'
import { Link } from '@/components/ui/Link'
import { Photo } from '@/components/ui/Photo'
import { Accent, Eyebrow } from '@/components/ui/Section'
import { siteUrl } from '@/content/site'
import { href } from '@/i18n/config'
import { getCommon, getLocale } from '@/i18n/server'

export interface Crumb {
  label: string
  href?: string
}

/** Dark page header used by every inner page: breadcrumb, eyebrow, title, intro and optional actions. */
export async function PageHero({
  eyebrow,
  title,
  lead,
  crumbs = [],
  compact,
  image,
  children,
}: {
  eyebrow?: string
  title: string
  lead?: string
  crumbs?: Crumb[]
  /** Shorter header for app-like pages (booking, account). */
  compact?: boolean
  /** A photograph behind the header, darkened so the text stays readable. */
  image?: string | null
  children?: ReactNode
}) {
  const [t, locale] = await Promise.all([getCommon(), getLocale()])
  const trail: Crumb[] = [{ label: t.nav.home, href: '/' }, ...crumbs]

  return (
    <section className={`on-dark grain relative overflow-hidden bg-ink-950 text-bone-100 ${compact ? 'pb-12 pt-32 sm:pb-14 sm:pt-36' : 'pb-20 pt-36 sm:pb-24 sm:pt-44'}`}>
      {/* The same trail for search engines: they show it in results instead of the bare address. */}
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: trail.map((crumb, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            name: crumb.label,
            ...(crumb.href ? { item: `${siteUrl}${href(locale, crumb.href)}` } : {}),
          })),
        }}
      />
      {image ? (
        <div aria-hidden className="absolute inset-0">
          <Photo src={image} alt="" sizes="100vw" eager className="animate-settle" />
          <div className="absolute inset-0 bg-gradient-to-r from-ink-950/95 via-ink-950/75 to-ink-950/30" />
          <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-transparent to-ink-950/55" />
        </div>
      ) : (
        <Backdrop />
      )}
      <div className="container-page relative">
        <nav aria-label={t.breadcrumb}>
          <ol className="flex flex-wrap items-center gap-1.5 text-xs text-bone-100/65">
            {trail.map((crumb, index) => (
              <li key={`${crumb.label}-${index}`} className="flex items-center gap-1.5">
                {index > 0 ? <ChevronRight aria-hidden className="size-3" /> : null}
                {crumb.href ? (
                  <Link href={crumb.href} className="transition-colors hover:text-gold-300">
                    {crumb.label}
                  </Link>
                ) : (
                  <span aria-current="page" className="text-bone-100/85">
                    {crumb.label}
                  </span>
                )}
              </li>
            ))}
          </ol>
        </nav>

        <div className="mt-8 max-w-4xl animate-rise">
          <h1 className={`display text-bone-50 ${compact ? 'text-4xl sm:text-5xl' : 'text-5xl sm:text-6xl lg:text-7xl'}`}>
            {eyebrow ? (
              <Eyebrow onDark inHeading>
                {eyebrow}
              </Eyebrow>
            ) : null}
            <span className={`block ${eyebrow ? 'mt-5' : ''}`}>
              <Accent text={title} />
            </span>
          </h1>
          {lead ? <p className="mt-6 max-w-2xl text-base leading-relaxed text-bone-100/75 sm:text-lg">{lead}</p> : null}
          {children ? <div className="mt-9 flex flex-wrap items-center gap-4">{children}</div> : null}
        </div>
      </div>
    </section>
  )
}
