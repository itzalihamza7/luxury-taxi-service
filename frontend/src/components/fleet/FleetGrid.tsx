import { Suspense } from 'react'
import { getCommon, getLocale } from '@/i18n/server'
import { loadVehicles, quietly } from '@/lib/server-api'
import { VehicleCard, VehicleCardSkeleton } from './VehicleCard'

interface Props {
  /** Show only these vehicles, in this order. Omit to show the whole fleet. */
  slugs?: string[]
  /** Leave one vehicle out (used for "other vehicles" on a vehicle page). */
  exclude?: string
  limit?: number
}

const grid = 'grid gap-5 sm:grid-cols-2 lg:grid-cols-3'

async function Vehicles({ slugs, exclude, limit }: Props) {
  // The fleet lives in the database, which is only reachable while the site is
  // running: it is loaded on request (from a cache), never while building.
  const [all, locale, t] = await Promise.all([quietly('the fleet', loadVehicles(), []), getLocale(), getCommon()])
  let vehicles = slugs ? slugs.flatMap((slug) => all.filter((vehicle) => vehicle.slug === slug)) : all
  if (exclude) vehicles = vehicles.filter((vehicle) => vehicle.slug !== exclude)
  if (limit) vehicles = vehicles.slice(0, limit)

  if (vehicles.length === 0) {
    return <p className="rounded-md border border-white/10 px-6 py-10 text-center text-sm text-bone-100/60">{t.errors.API_UNAVAILABLE}</p>
  }
  return (
    <ul className={grid}>
      {vehicles.map((vehicle) => (
        <li key={vehicle.id} className="reveal">
          <VehicleCard vehicle={vehicle} locale={locale} t={t} />
        </li>
      ))}
    </ul>
  )
}

/** The fleet as a grid of cards. Must sit on a dark surface. Streams in after the static page shell. */
export function FleetGrid(props: Props) {
  const placeholders = props.slugs?.length ?? props.limit ?? 6
  return (
    <Suspense
      fallback={
        <div className={grid}>
          {Array.from({ length: placeholders }, (_, index) => (
            <VehicleCardSkeleton key={index} />
          ))}
        </div>
      }
    >
      <Vehicles {...props} />
    </Suspense>
  )
}
