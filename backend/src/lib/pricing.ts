/**
 * Fare calculation. All amounts are integer cents; totals are rounded up to a
 * whole euro so customers see clean, all-inclusive prices.
 */

export const RIDE_TYPES = ['one_way', 'return', 'local', 'hourly', 'city_to_city', 'airport'] as const
export type RideType = (typeof RIDE_TYPES)[number]

export interface VehicleRates {
  /** A transfer inside the M-30, or between the airport and the M-30 (see `lib/zone.ts`). */
  zoneFareCents: number
  /** Each road kilometre beyond that zone. */
  perKmCents: number
  /** Null when hourly hire is agreed case by case. */
  hourlyRateCents: number | null
}

function roundUpToWholeUnit(cents: number): number {
  return Math.ceil(cents / 100) * 100
}

/** Price of a single transfer of which `beyondZoneM` road metres lie beyond the price zone. */
export function transferFareCents(rates: VehicleRates, beyondZoneM: number): number {
  // Integer arithmetic (cents x metres) avoids floating-point drift.
  return roundUpToWholeUnit(rates.zoneFareCents + Math.ceil((rates.perKmCents * Math.max(0, beyondZoneM)) / 1000))
}

export interface FareInput {
  rideType: RideType
  /** Road metres of one leg beyond the price zone. Ignored for hourly hire. */
  beyondZoneM: number
  /** Booked hours. Only used for hourly hire. */
  hours: number
}

/**
 * Total fare for a ride, or null when it is agreed with the business (hourly hire of a vehicle
 * without an hourly rate). A return trip is priced as two transfers.
 */
export function fareCents(rates: VehicleRates, input: FareInput): number | null {
  if (input.rideType === 'hourly') {
    return rates.hourlyRateCents === null ? null : roundUpToWholeUnit(rates.hourlyRateCents * input.hours)
  }
  const oneWay = transferFareCents(rates, input.beyondZoneM)
  return input.rideType === 'return' ? oneWay * 2 : oneWay
}
