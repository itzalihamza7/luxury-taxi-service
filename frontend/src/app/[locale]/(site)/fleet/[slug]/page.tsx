import { Check, ChevronRight, Luggage, Users } from 'lucide-react'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { Backdrop } from '@/components/art/Backdrop'
import { VehicleImage } from '@/components/art/VehicleArt'
import { FleetGrid } from '@/components/fleet/FleetGrid'
import { WhatsAppButton } from '@/components/layout/ContactButtons'
import { CtaBand } from '@/components/layout/CtaBand'
import { PageSkeleton } from '@/components/layout/PageSkeleton'
import { ButtonLink } from '@/components/ui/Button'
import { Link } from '@/components/ui/Link'
import { Eyebrow, Section, SectionHeading } from '@/components/ui/Section'
import { fill } from '@/i18n/config'
import { getCommon, getLocale, getPages } from '@/i18n/server'
import { formatMoney } from '@/lib/format'
import { pageMetadata } from '@/lib/seo'
import { loadVehicles, quietly } from '@/lib/server-api'

type Props = PageProps<'/[locale]/fleet/[slug]'>

/**
 * Vehicles live in the database, so their pages cannot be listed when the site
 * is built. Each one is rendered on request (from the cached fleet) instead.
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const [vehicles, locale] = await Promise.all([quietly('the fleet', () => loadVehicles(), []), getLocale()])
  const vehicle = vehicles.find((candidate) => candidate.slug === slug)
  if (!vehicle) return {}
  return pageMetadata({
    locale,
    path: `/fleet/${vehicle.slug}`,
    title: `${vehicle.name} — ${vehicle.tagline[locale]}`,
    description: vehicle.description[locale],
  })
}

export default function VehiclePage({ params }: Props) {
  return (
    <>
      <Suspense fallback={<PageSkeleton />}>
        <VehicleDetails params={params} />
      </Suspense>
      <CtaBand />
    </>
  )
}

async function VehicleDetails({ params }: Pick<Props, 'params'>) {
  const { slug } = await params
  // If the fleet cannot be loaded this fails, and the error page is shown,
  // rather than claiming that this vehicle does not exist.
  const [vehicles, locale, t, p] = await Promise.all([loadVehicles(), getLocale(), getCommon(), getPages()])
  const vehicle = vehicles.find((candidate) => candidate.slug === slug)
  if (!vehicle) notFound()

  const f = p.fleet
  const bookHref = `/booking?vehicle=${vehicle.slug}`
  // A tagline can repeat the category (the Maybach is "Flagship" in both): say it once.
  const tagline = vehicle.tagline[locale].trim()
  const category = t.categories[vehicle.category]
  const label = tagline && tagline.toLowerCase() !== category.toLowerCase() ? `${tagline} · ${category}` : category

  return (
    <>
      <section className="on-dark grain relative bg-ink-950 pb-20 pt-36 text-bone-100 sm:pb-24 sm:pt-44">
        <Backdrop />
        <div className="container-page relative">
          <nav aria-label={t.breadcrumb}>
            <ol className="flex flex-wrap items-center gap-1.5 text-xs text-bone-100/55">
              <li>
                <Link href="/" className="transition-colors hover:text-gold-300">
                  {t.nav.home}
                </Link>
              </li>
              <li className="flex items-center gap-1.5">
                <ChevronRight aria-hidden className="size-3" />
                <Link href="/fleet" className="transition-colors hover:text-gold-300">
                  {t.nav.fleet}
                </Link>
              </li>
              <li className="flex items-center gap-1.5">
                <ChevronRight aria-hidden className="size-3" />
                <span aria-current="page" className="text-bone-100/80">
                  {vehicle.name}
                </span>
              </li>
            </ol>
          </nav>

          <div className="mt-10 grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
            <div className="animate-rise">
              <Eyebrow onDark>{label}</Eyebrow>
              <h1 className="display mt-5 text-5xl text-bone-50 sm:text-6xl lg:text-7xl">{vehicle.name}</h1>
              <p className="mt-6 max-w-xl text-base leading-relaxed text-bone-100/70 sm:text-lg">{vehicle.description[locale]}</p>

              <dl className="mt-9 grid max-w-xl grid-cols-2 gap-px overflow-hidden rounded-md border border-white/10 bg-white/10 sm:grid-cols-4">
                {[
                  { icon: Users, label: f.passengers, value: String(vehicle.passengers) },
                  { icon: Luggage, label: f.luggage, value: String(vehicle.luggage) },
                  { label: f.transferFrom, value: formatMoney(vehicle.fromCents, 'EUR', locale) },
                  { label: f.hourly, value: vehicle.hourlyRateCents === null ? t.payment.onRequest : fill(t.units.perHour, { price: formatMoney(vehicle.hourlyRateCents, 'EUR', locale) }), small: true },
                ].map((item) => (
                  <div key={item.label} className="bg-ink-950 p-4">
                    <dt className="flex items-center gap-1.5 text-[0.6875rem] tracking-wide text-bone-100/55 uppercase">
                      {item.icon ? <item.icon aria-hidden className="size-3.5" /> : null}
                      {item.label}
                    </dt>
                    <dd className={`mt-2 font-display text-bone-50 ${item.small ? 'text-lg leading-tight' : 'text-3xl'}`}>{item.value}</dd>
                  </div>
                ))}
              </dl>

              <div className="mt-9 flex flex-wrap items-center gap-4">
                <ButtonLink href={bookHref} size="lg" arrow>
                  {f.bookVehicle}
                </ButtonLink>
                <WhatsAppButton message={vehicle.name} />
              </div>
            </div>

            <div className="animate-fade">
              <VehicleImage
                bodyType={vehicle.bodyType}
                imageUrl={vehicle.imageUrl}
                name={vehicle.name}
                sizes="(min-width: 1024px) 50vw, 100vw"
                eager
                className={vehicle.imageUrl ? 'aspect-[16/10] w-full rounded-xl shadow-[0_40px_80px_-40px_rgba(0,0,0,0.9)] ring-1 ring-white/10' : 'w-full text-bone-100'}
              />
            </div>
          </div>
        </div>
      </section>

      <Section tone="light">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-20">
          <div className="reveal">
            <Eyebrow>{f.highlightsTitle}</Eyebrow>
            <ul className="mt-6 divide-y divide-ink-900/10 border-y border-ink-900/10">
              {vehicle.highlights[locale].map((highlight) => (
                <li key={highlight} className="flex items-start gap-4 py-5 font-display text-2xl leading-snug">
                  <Check aria-hidden className="mt-1.5 size-5 shrink-0 text-gold-600" />
                  {highlight}
                </li>
              ))}
            </ul>
          </div>
          <div className="reveal rounded-md bg-bone-100 p-7 sm:p-9">
            <Eyebrow>{f.includedTitle}</Eyebrow>
            <ul className="mt-6 space-y-5">
              {p.home.included.slice(0, 4).map((item) => (
                <li key={item.title}>
                  <p className="font-medium">{item.title}</p>
                  <p className="mt-1 text-[0.9375rem] leading-relaxed text-ink-900/65">{item.text}</p>
                </li>
              ))}
            </ul>
            <p className="mt-7 border-t border-ink-900/10 pt-5 text-sm text-ink-900/60">{f.priceNote}</p>
          </div>
        </div>
      </Section>

      <Section tone="dark">
        <SectionHeading eyebrow={f.otherEyebrow} title={f.otherTitle} onDark>
          <ButtonLink href="/fleet" variant="outline-light" arrow>
            {t.actions.viewFleet}
          </ButtonLink>
        </SectionHeading>
        <FleetGrid exclude={vehicle.slug} limit={3} />
      </Section>
    </>
  )
}
