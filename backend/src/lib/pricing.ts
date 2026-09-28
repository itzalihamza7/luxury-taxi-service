/**
 * Fare calculation. All amounts are integer cents; totals are rounded up to a
 * whole euro so customers see clean, all-inclusive prices.
 */

export const RIDE_TYPES = ['one_way', 'return', 'local', 'hourly', 'city_to_city', 'airport'] as const
export type RideType = (typeof RIDE_TYPES)[number]

export interface VehicleRates {
  baseFareCents: number
  perKmCents: number
  hourlyRateCents: number
  minFareCents: number
}

function roundUpToWholeUnit(cents: number): number {
  return Math.ceil(cents / 100) * 100
}

/** Price of a single point-to-point transfer over `distanceM` metres. */
export function transferFareCents(rates: VehicleRates, distanceM: number): number {
  // Integer arithmetic (cents x metres) avoids floating-point drift.
  const metered = Math.ceil((rates.baseFareCents * 1000 + rates.perKmCents * Math.max(0, distanceM)) / 1000)
  return roundUpToWholeUnit(Math.max(metered, rates.minFareCents))
}

export interface FareInput {
  rideType: RideType
  /** Road distance of one leg, in metres. Ignored for hourly hire. */
  distanceM: number
  /** Booked hours. Only used for hourly hire. */
  hours: number
}

/** Total fare for a ride. A return trip is priced as two transfers. */
export function fareCents(rates: VehicleRates, input: FareInput): number {
  if (input.rideType === 'hourly') {
    return roundUpToWholeUnit(rates.hourlyRateCents * input.hours)
  }
  const oneWay = transferFareCents(rates, input.distanceM)
  return input.rideType === 'return' ? oneWay * 2 : oneWay
}
