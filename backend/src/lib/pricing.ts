/**
 * Fare calculation. All amounts are integer cents; fares are rounded up to a whole euro, then
 * quoted just under it (`justUnderCents`).
 */

export const RIDE_TYPES = ['one_way', 'return', 'local', 'hourly', 'city_to_city', 'airport'] as const
export type RideType = (typeof RIDE_TYPES)[number]

export interface VehicleRates {
  /** A transfer inside the M-30, or between the airport and the M-30 (see `lib/zone.ts`). */
  zoneFareCents: number
  /** Each road kilometre beyond that zone. */
  perKmCents: number
  /** Each road kilometre more than 120 km from the centre of Madrid; null (or left out) charges `perKmCents` there too. */
  farPerKmCents?: number | null
  /** Null when hourly hire is agreed case by case. */
  hourlyRateCents: number | null
}

function roundUpToWholeUnit(cents: number): number {
  return Math.ceil(cents / 100) * 100
}

/**
 * Price of a single transfer of which `beyondZoneM` road metres lie beyond the price zone, `farM`
 * of them more than 120 km from the centre of Madrid.
 */
export function transferFareCents(rates: VehicleRates, beyondZoneM: number, farM = 0): number {
  const farMetres = Math.min(Math.max(0, farM), Math.max(0, beyondZoneM))
  const nearMetres = Math.max(0, beyondZoneM) - farMetres
  // Integer arithmetic (cents x metres) avoids floating-point drift.
  const distanceCents = rates.perKmCents * nearMetres + (rates.farPerKmCents ?? rates.perKmCents) * farMetres
  return roundUpToWholeUnit(rates.zoneFareCents + Math.ceil(distanceCents / 1000))
}

export interface FareInput {
  rideType: RideType
  /** Road metres of one leg beyond the price zone. Ignored for hourly hire. */
  beyondZoneM: number
  /** Of those, the metres more than 120 km from the centre of Madrid. */
  farM?: number
  /** Booked hours. Only used for hourly hire. */
  hours: number
}

/**
 * The price shown, and charged, just under the round figure: €89.30 rather than €90. It is 10 to
 * 90 cents less, in steps of 10 cents, picked from `seed` (the vehicle and the journey), so the
 * same trip always gets the same price. Amounts of a euro or less are left as they are.
 */
export function justUnderCents(cents: number, seed: string): number {
  if (cents <= 100) return cents
  // FNV-1a: a quick, stable hash of the seed.
  let hash = 2166136261
  for (let index = 0; index < seed.length; index++) {
    hash ^= seed.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return cents - (((hash >>> 0) % 9) + 1) * 10
}

/**
 * Total fare for a ride, or null when it is agreed with the business (hourly hire of a vehicle
 * without an hourly rate). A return trip is priced as two transfers.
 */
export function fareCents(rates: VehicleRates, input: FareInput): number | null {
  if (input.rideType === 'hourly') {
    return rates.hourlyRateCents === null ? null : roundUpToWholeUnit(rates.hourlyRateCents * input.hours)
  }
  const oneWay = transferFareCents(rates, input.beyondZoneM, input.farM)
  return input.rideType === 'return' ? oneWay * 2 : oneWay
}
