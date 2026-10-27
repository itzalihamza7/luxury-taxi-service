import { Router } from 'express'
import { z } from 'zod'
import { LIMITS } from '../../config.js'
import type { AppContext } from '../../context.js'
import { db } from '../../db/client.js'
import { quotes, type Quote, type QuoteOption, type Vehicle } from '../../db/schema.js'
import { badRequest } from '../../lib/errors.js'
import { haversineM, isInServiceArea, type RouteResult } from '../../lib/geo.js'
import { fareCents, justUnderCents, RIDE_TYPES } from '../../lib/pricing.js'
import { zonedDateTimeToUtc } from '../../lib/time.js'
import { metresBeyondZone, metresFar } from '../../lib/zone.js'
import { parse } from '../../lib/validate.js'
import { listActiveVehicles, serializeVehicle, wantsCompact } from '../vehicles/routes.js'

const placeSchema = z.object({
  label: z.string().trim().min(1).max(200),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
})

const quoteSchema = z.object({
  rideType: z.enum(RIDE_TYPES),
  pickup: placeSchema,
  dropoff: placeSchema.nullish(),
  pickupDate: z.string(),
  pickupTime: z.string(),
  returnDate: z.string().nullish(),
  returnTime: z.string().nullish(),
  hours: z.number().int().min(LIMITS.minHours).max(LIMITS.maxHours).nullish(),
  adults: z.number().int().min(1).max(LIMITS.maxPassengers),
  children: z.number().int().min(0).max(LIMITS.maxPassengers).default(0),
  luggage: z.number().int().min(0).max(LIMITS.maxLuggage).default(0),
})

const fieldError = (field: string, code: string) =>
  badRequest('VALIDATION', 'Please check the highlighted fields.', { [field]: code })

/** A quote together with the vehicle details the booking screen needs to display it. */
export function serializeQuote(quote: Quote, fleet: Vehicle[]) {
  const byId = new Map(fleet.map((vehicle) => [vehicle.id, vehicle]))
  return {
    id: quote.id,
    expiresAt: quote.expiresAt.toISOString(),
    rideType: quote.rideType,
    pickup: quote.pickup,
    dropoff: quote.dropoff,
    pickupAt: quote.pickupAt.toISOString(),
    returnAt: quote.returnAt?.toISOString() ?? null,
    hours: quote.hours,
    adults: quote.adults,
    children: quote.children,
    luggage: quote.luggage,
    route:
      quote.distanceM !== null && quote.durationS !== null
        ? { distanceM: quote.distanceM, durationS: quote.durationS, source: quote.routeSource }
        : null,
    currency: quote.currency,
    options: quote.options.flatMap((option) => {
      const vehicle = byId.get(option.vehicleId)
      return vehicle ? [{ ...option, vehicle: serializeVehicle(vehicle) }] : []
    }),
  }
}

/** How far in the past an operator may still enter a pickup (a ride that is just leaving). */
const OPERATOR_GRACE_MINUTES = 15

/**
 * Price a journey for every vehicle and store the result as a quote.
 *
 * Customers must give the minimum notice. An operator taking a booking by
 * phone may not: they can enter a ride that leaves right away.
 */
export async function createQuote({ config, findRoute }: AppContext, body: unknown, { byOperator = false } = {}) {
  const input = parse(quoteSchema, body)
  const isHourly = input.rideType === 'hourly'
  const now = Date.now()

  // --- When ---------------------------------------------------------------
  const pickupAt = zonedDateTimeToUtc(input.pickupDate, input.pickupTime, config.BUSINESS_TIMEZONE)
  if (!pickupAt) throw fieldError('pickupDate', 'invalid')
  const earliest = byOperator ? now - OPERATOR_GRACE_MINUTES * 60_000 : now + config.MIN_LEAD_MINUTES * 60_000
  if (pickupAt.getTime() < earliest) throw fieldError('pickupTime', byOperator ? 'in_past' : 'lead_time')
  if (pickupAt.getTime() - now > LIMITS.maxAdvanceDays * 86_400_000) throw fieldError('pickupDate', 'too_far_ahead')

  let returnAt: Date | null = null
  if (input.rideType === 'return') {
    if (!input.returnDate) throw fieldError('returnDate', 'required')
    if (!input.returnTime) throw fieldError('returnTime', 'required')
    returnAt = zonedDateTimeToUtc(input.returnDate, input.returnTime, config.BUSINESS_TIMEZONE)
    if (!returnAt) throw fieldError('returnDate', 'invalid')
    if (returnAt.getTime() <= pickupAt.getTime()) throw fieldError('returnTime', 'before_pickup')
  }

  let hours: number | null = null
  if (isHourly) {
    if (!input.hours) throw fieldError('hours', 'required')
    hours = input.hours
  }

  // --- Who ----------------------------------------------------------------
  const passengers = input.adults + input.children
  if (passengers > LIMITS.maxPassengers) throw fieldError('adults', 'too_many_passengers')

  // --- Where --------------------------------------------------------------
  if (!isInServiceArea(input.pickup)) throw fieldError('pickup', 'outside_area')
  const dropoff = input.dropoff ?? null
  if (!isHourly && !dropoff) throw fieldError('dropoff', 'required')
  if (dropoff && !isInServiceArea(dropoff)) throw fieldError('dropoff', 'outside_area')

  let route: RouteResult | null = null
  if (!isHourly && dropoff) {
    if (haversineM(input.pickup, dropoff) < 100) throw fieldError('dropoff', 'same_as_pickup')
    route = await findRoute(input.pickup, dropoff)
    if (route.distanceM > LIMITS.maxDistanceKm * 1000) throw fieldError('dropoff', 'too_far')
  }

  // --- Price every vehicle ------------------------------------------------
  const beyondZoneM = route && dropoff ? metresBeyondZone(input.pickup, dropoff, route.distanceM) : 0
  const farM = route && dropoff ? metresFar(input.pickup, dropoff, route.distanceM) : 0
  const fleet = await listActiveVehicles()
  // The same journey in the same vehicle always lands on the same price just under the round one.
  const at = (place: { lat: number; lng: number }) => `${place.lat.toFixed(4)},${place.lng.toFixed(4)}`
  const journey = `${input.rideType}|${at(input.pickup)}|${dropoff ? at(dropoff) : ''}|${hours ?? ''}`
  const options: QuoteOption[] = fleet.map((vehicle) => {
    const reason = passengers > vehicle.passengers ? 'passengers' : input.luggage > vehicle.luggage ? 'luggage' : undefined
    const fare = fareCents(vehicle, { rideType: input.rideType, beyondZoneM, farM, hours: hours ?? 0 })
    return {
      vehicleId: vehicle.id,
      totalCents: fare === null ? null : justUnderCents(fare, `${vehicle.id}|${journey}`),
      available: !reason,
      ...(reason ? { reason } : {}),
    }
  })

  const [quote] = await db
    .insert(quotes)
    .values({
      rideType: input.rideType,
      pickup: input.pickup,
      dropoff,
      pickupAt,
      returnAt,
      hours,
      adults: input.adults,
      children: input.children,
      luggage: input.luggage,
      distanceM: route?.distanceM ?? null,
      durationS: route?.durationS ?? null,
      routeSource: route?.source ?? null,
      options,
      currency: config.CURRENCY,
      expiresAt: new Date(now + config.QUOTE_TTL_MINUTES * 60_000),
    })
    .returning()
  if (!quote) throw new Error('quote insert returned no row')

  return serializeQuote(quote, fleet)
}

/** `?view=compact` (see `compactVehicle`): each option is the vehicle's name, size and price. */
function compactQuote(quote: ReturnType<typeof serializeQuote>) {
  return {
    ...quote,
    options: quote.options.map(({ vehicleId, totalCents, available, vehicle }) => ({
      vehicleId,
      vehicleName: vehicle.name,
      passengers: vehicle.passengers,
      luggage: vehicle.luggage,
      totalCents,
      available,
    })),
  }
}

export function quotesRouter(context: AppContext): Router {
  const router = Router()

  router.post('/', context.rateLimit({ name: 'quotes', windowMs: 60_000, limit: 30 }), async (req, res) => {
    const quote = await createQuote(context, req.body)
    res.status(201).json({ quote: wantsCompact(req.query) ? compactQuote(quote) : quote })
  })

  return router
}
