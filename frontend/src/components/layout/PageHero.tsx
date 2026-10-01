import { ChevronRight } from 'lucide-react'
import type { ReactNode } from 'react'
import { Backdrop } from '@/components/art/Backdrop'
import { Link } from '@/components/ui/Link'
import { Accent, Eyebrow } from '@/components/ui/Section'
import { getCommon } from '@/i18n/server'

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
  children,
}: {
  eyebrow?: string
  title: string
  lead?: string
  crumbs?: Crumb[]
  /** Shorter header for app-like pages (booking, account). */
  compact?: boolean
  children?: ReactNode
}) {
  const t = await getCommon()
  const trail: Crumb[] = [{ label: t.nav.home, href: '/' }, ...crumbs]

  return (
    <section className={`on-dark grain relative bg-ink-950 text-bone-100 ${compact ? 'pb-12 pt-32 sm:pb-14 sm:pt-36' : 'pb-20 pt-36 sm:pb-24 sm:pt-44'}`}>
      <Backdrop />
      <div className="container-page relative">
        <nav aria-label={t.breadcrumb}>
          <ol className="flex flex-wrap items-center gap-1.5 text-xs text-bone-100/55">
            {trail.map((crumb, index) => (
              <li key={`${crumb.label}-${index}`} className="flex items-center gap-1.5">
                {index > 0 ? <ChevronRight aria-hidden className="size-3" /> : null}
                {crumb.href ? (
                  <Link href={crumb.href} className="transition-colors hover:text-gold-300">
                    {crumb.label}
                  </Link>
                ) : (
                  <span aria-current="page" className="text-bone-100/80">
                    {crumb.label}
                  </span>
                )}
              </li>
            ))}
          </ol>
        </nav>

        <div className="mt-8 max-w-4xl animate-rise">
          {eyebrow ? <Eyebrow onDark>{eyebrow}</Eyebrow> : null}
          <h1 className={`display mt-5 text-bone-50 ${compact ? 'text-4xl sm:text-5xl' : 'text-5xl sm:text-6xl lg:text-7xl'}`}>
            <Accent text={title} />
          </h1>
          {lead ? <p className="mt-6 max-w-2xl text-base leading-relaxed text-bone-100/70 sm:text-lg">{lead}</p> : null}
          {children ? <div className="mt-9 flex flex-wrap items-center gap-4">{children}</div> : null}
        </div>
      </div>
    </section>
  )
}
