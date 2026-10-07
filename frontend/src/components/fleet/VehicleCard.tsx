import { ArrowUpRight, Luggage, Users } from 'lucide-react'
import { VehicleImage } from '@/components/art/VehicleArt'
import { Link } from '@/components/ui/Link'
import { fill, type Locale } from '@/i18n/config'
import type { CommonMessages } from '@/i18n/messages/common'
import { formatMoney } from '@/lib/format'
import type { Vehicle } from '@/lib/types'

/** Capacity line shared by every place a vehicle is shown. */
export function Capacity({ vehicle, t, className = '' }: { vehicle: Pick<Vehicle, 'passengers' | 'luggage'>; t: CommonMessages; className?: string }) {
  return (
    <ul className={`flex flex-wrap items-center gap-x-5 gap-y-1 text-sm ${className}`}>
      <li className="inline-flex items-center gap-2">
        <Users aria-hidden className="size-4 opacity-60" />
        {fill(t.units.upToPassengers, { count: vehicle.passengers })}
      </li>
      <li className="inline-flex items-center gap-2">
        <Luggage aria-hidden className="size-4 opacity-60" />
        {fill(t.units.upToBags, { count: vehicle.luggage })}
      </li>
    </ul>
  )
}

const frame = 'flex h-full flex-col overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]'

/** A vehicle on a dark surface: its photo (or drawing), what it carries and its starting price. */
export function VehicleCard({ vehicle, locale, t, currency = 'EUR' }: { vehicle: Vehicle; locale: Locale; t: CommonMessages; currency?: string }) {
  return (
    <Link
      href={`/fleet/${vehicle.slug}`}
      prefetch
      className={`group relative ${frame} transition-[border-color,background-color,transform,box-shadow] duration-500 ease-out-expo hover:-translate-y-1 hover:border-gold-300/40 hover:bg-white/[0.05] hover:shadow-[0_30px_60px_-30px_rgba(0,0,0,0.8)]`}
    >
      <div className="relative">
        {/* The drawing needs room around it; a photo runs to the edges. */}
        <VehicleImage bodyType={vehicle.bodyType} imageUrl={vehicle.imageUrl} name={vehicle.name} className={vehicle.imageUrl ? 'aspect-[16/10] w-full' : 'aspect-[16/10] w-full px-7 pt-12 text-bone-100'} />
        {vehicle.imageUrl ? <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-ink-950/70 to-transparent" /> : null}
        <p className="eyebrow absolute left-4 top-4 rounded-full border border-white/10 bg-ink-950/65 px-3 py-1.5 text-gold-300 backdrop-blur-md">{vehicle.tagline[locale]}</p>
      </div>

      <div className="flex flex-1 flex-col p-6 sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <h3 className="display text-2xl text-bone-50 sm:text-[1.75rem]">{vehicle.name}</h3>
          <ArrowUpRight aria-hidden className="mt-1 size-5 shrink-0 text-bone-100/55 transition-all duration-500 ease-out-expo group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-gold-300" />
        </div>
        <Capacity vehicle={vehicle} t={t} className="mt-3 text-bone-100/60" />

        <div className="mt-auto pt-6">
          <div className="flex items-end justify-between border-t border-white/10 pt-5">
            <p className="text-sm text-bone-100/55">{t.units.fromLabel}</p>
            <p className="font-display text-2xl text-bone-50">{formatMoney(vehicle.fromCents, currency, locale)}</p>
          </div>
        </div>
      </div>
    </Link>
  )
}

/** Placeholder with the same footprint as a card, shown while the fleet loads. */
export function VehicleCardSkeleton() {
  return (
    <div aria-hidden className={frame}>
      <div className="aspect-[16/10] w-full animate-pulse bg-white/5" />
      <div className="p-6 sm:p-7">
        <div className="h-7 w-2/3 animate-pulse rounded bg-white/10" />
        <div className="mt-4 h-4 w-1/2 animate-pulse rounded bg-white/5" />
        <div className="mt-6 h-12 border-t border-white/10" />
      </div>
    </div>
  )
}
