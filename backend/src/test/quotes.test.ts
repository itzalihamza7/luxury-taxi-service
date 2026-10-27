import request from 'supertest'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../db/client.js'
import { quotes, vehicles } from '../db/schema.js'
import { metresBeyondZone } from '../lib/zone.js'
import { buildApp, localDateTime, PLACES, quotePayload, requestQuote, resetDatabase, TIME_ZONE } from './helpers.js'

const app = buildApp()
const post = (overrides: Record<string, unknown> = {}) => request(app).post('/api/quotes').send(quotePayload(overrides))

const bySlug = (quote: Awaited<ReturnType<typeof requestQuote>>) =>
  Object.fromEntries(quote.options.map((option) => [option.vehicle.slug, option]))

beforeEach(resetDatabase)

describe('POST /api/quotes', () => {
  it('prices every vehicle for the journey and stores the quote', async () => {
    const response = await post()
    expect(response.status).toBe(201)

    const { quote } = response.body
    expect(quote.options).toHaveLength(6)
    expect(quote.currency).toBe('EUR')
    expect(quote.route.source).toBe('estimate')
    // Barajas T4 to Puerta del Sol is about 19 km by road (a measured route).
    expect(quote.route.distanceM).toBeGreaterThan(18_000)
    expect(quote.route.distanceM).toBeLessThan(20_000)

    const options = bySlug(quote)
    // The airport to the centre: the fixed price of each vehicle, whatever the distance.
    expect(options['mercedes-e-class']?.totalCents).toBe(9000)
    expect(options['toyota-corolla']?.totalCents).toBe(7000)
    expect(options['mercedes-maybach']?.totalCents).toBe(30_000)
    expect(options['toyota-yaris']).toBeUndefined()
    expect(quote.options.every((option: { totalCents: number }) => option.totalCents % 100 === 0)).toBe(true)

    const expiresInMinutes = (new Date(quote.expiresAt).getTime() - Date.now()) / 60_000
    expect(expiresInMinutes).toBeGreaterThan(28)
    expect(expiresInMinutes).toBeLessThanOrEqual(30)

    expect(await db.select().from(quotes)).toHaveLength(1)
  })

  it('converts the local pickup time to the right instant', async () => {
    const when = localDateTime(10, '14:30')
    const response = await post({ pickupDate: when.date, pickupTime: when.time })

    const local = new Intl.DateTimeFormat('en-GB', { timeZone: TIME_ZONE, dateStyle: 'short', timeStyle: 'short' }).format(
      new Date(response.body.quote.pickupAt),
    )
    expect(local).toContain('14:30')
  })

  it('charges the fixed price anywhere inside the M-30', async () => {
    const bernabeu = { label: 'Estadio Santiago Bernabéu', lat: 40.4531, lng: -3.6883 }
    const local = bySlug(await requestQuote(app, { pickup: PLACES.sol, dropoff: bernabeu, rideType: 'local' }))
    expect(local['mercedes-e-class']?.totalCents).toBe(9000)
    expect(local['mercedes-v-class']?.totalCents).toBe(9000)
    expect(local['mercedes-s-class']?.totalCents).toBe(15_000)
  })

  it('adds each kilometre beyond the M-30 to the fixed price', async () => {
    const quote = await requestQuote(app, { pickup: PLACES.sol, dropoff: PLACES.toledo, rideType: 'city_to_city' })
    const eClass = bySlug(quote)['mercedes-e-class']
    const beyondKm = metresBeyondZone(PLACES.sol, PLACES.toledo, quote.route?.distanceM ?? 0) / 1000
    // 90.00 fixed + 2.30 for each km beyond the M-30, rounded up to the next euro.
    expect(eClass?.totalCents).toBe(Math.ceil((9000 + 230 * beyondKm) / 100) * 100)
    // Most of the 70-odd km to Toledo lie beyond the M-30.
    expect(beyondKm).toBeGreaterThan(55)
    expect(bySlug(quote)['mercedes-maybach']?.totalCents).toBe(Math.ceil((30_000 + 600 * beyondKm) / 100) * 100)
  })

  it('prices a return trip at twice the single journey', async () => {
    const single = bySlug(await requestQuote(app, { pickup: PLACES.sol, dropoff: PLACES.toledo }))
    const back = localDateTime(4, '18:00')
    const returned = bySlug(
      await requestQuote(app, { rideType: 'return', pickup: PLACES.sol, dropoff: PLACES.toledo, returnDate: back.date, returnTime: back.time }),
    )
    expect(returned['mercedes-e-class']?.totalCents).toBe((single['mercedes-e-class']?.totalCents ?? 0) * 2)
  })

  it('prices hourly hire by the hour and needs no drop-off', async () => {
    const quote = await requestQuote(app, { rideType: 'hourly', dropoff: null, hours: 4 })
    expect(quote.route).toBeNull()
    expect(bySlug(quote)['mercedes-e-class']?.totalCents).toBe(4 * 8500)
    expect(bySlug(quote)['mercedes-s-class']?.totalCents).toBe(4 * 12_000)
    // The Sprinter has no hourly rate: it can still be booked, at a price agreed afterwards.
    expect(bySlug(quote)['mercedes-sprinter']).toMatchObject({ totalCents: null, available: true })
  })

  it('marks vehicles that are too small for the party or its luggage', async () => {
    const group = bySlug(await requestQuote(app, { adults: 6, children: 2, luggage: 4 }))
    expect(group['mercedes-e-class']).toMatchObject({ available: false, reason: 'passengers' })
    expect(group['mercedes-v-class']).toMatchObject({ available: false, reason: 'passengers' })
    expect(group['mercedes-sprinter']?.available).toBe(true)

    const bags = bySlug(await requestQuote(app, { adults: 2, luggage: 5 }))
    expect(bags['mercedes-e-class']).toMatchObject({ available: false, reason: 'luggage' })
    expect(bags['mercedes-v-class']?.available).toBe(true)
  })

  it('leaves inactive vehicles out', async () => {
    await db.update(vehicles).set({ active: false })
    const response = await post()
    expect(response.status).toBe(201)
    expect(response.body.quote.options).toEqual([])
  })
})

describe('compact answers for AI assistants (?view=compact)', () => {
  // The website chat's assistant reads only the first 2,000 characters of an answer.
  const LIMIT = 2_000

  it('prices every vehicle by name and size, short enough to be read whole', async () => {
    const response = await request(app).post('/api/quotes?view=compact').send(quotePayload())
    expect(response.status).toBe(201)
    const { quote } = response.body
    expect(quote.options).toHaveLength(6)
    expect(quote.options.find((option: { vehicleName: string }) => option.vehicleName === 'Mercedes-Maybach S-Class')).toMatchObject({
      totalCents: 30_000,
      available: true,
      passengers: expect.any(Number),
      luggage: expect.any(Number),
      vehicleId: expect.any(String),
    })
    expect(quote.options[0].vehicle).toBeUndefined()
    expect(quote.id).toEqual(expect.any(String))
    expect(JSON.stringify(response.body).length).toBeLessThan(LIMIT)
  })

  it('lists the fleet without its descriptions', async () => {
    const response = await request(app).get('/api/vehicles?view=compact')
    expect(response.status).toBe(200)
    expect(response.body.vehicles).toHaveLength(6)
    expect(response.body.vehicles[0]).toEqual({
      id: expect.any(String),
      name: expect.any(String),
      category: expect.any(String),
      passengers: expect.any(Number),
      luggage: expect.any(Number),
      fromCents: expect.any(Number),
      hourlyRateCents: 8500,
    })
    expect(JSON.stringify(response.body).length).toBeLessThan(LIMIT)
    // Without the parameter, the website's own answer is unchanged.
    expect((await request(app).get('/api/vehicles')).body.vehicles[0].description).toBeDefined()
  })
})

describe('quote validation', () => {
  const expectFieldError = async (overrides: Record<string, unknown>, field: string, code: string) => {
    const response = await post(overrides)
    expect(response.status, JSON.stringify(response.body)).toBe(400)
    expect(response.body.error.code).toBe('VALIDATION')
    expect(response.body.error.fields[field]).toBe(code)
  }

  it('enforces the two-hour minimum notice', async () => {
    const soon = new Date(Date.now() + 60 * 60_000)
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(soon)
    const get = (type: string) => parts.find((part) => part.type === type)?.value ?? ''
    await expectFieldError({ pickupDate: `${get('year')}-${get('month')}-${get('day')}`, pickupTime: `${get('hour')}:${get('minute')}` }, 'pickupTime', 'lead_time')
  })

  it('rejects dates in the past and too far ahead', async () => {
    await expectFieldError({ pickupDate: '2020-01-01' }, 'pickupTime', 'lead_time')
    await expectFieldError({ pickupDate: localDateTime(400).date }, 'pickupDate', 'too_far_ahead')
  })

  it('rejects malformed dates and times', async () => {
    await expectFieldError({ pickupDate: '31/12/2027' }, 'pickupDate', 'invalid')
    await expectFieldError({ pickupTime: '25:00' }, 'pickupDate', 'invalid')
    await expectFieldError({ pickupDate: '' }, 'pickupDate', 'invalid')
  })

  it('requires a drop-off unless the ride is hourly', async () => {
    await expectFieldError({ dropoff: null }, 'dropoff', 'required')
    await expectFieldError({ rideType: 'airport', dropoff: undefined }, 'dropoff', 'required')
  })

  it('requires hours for hourly hire, within 2-12', async () => {
    await expectFieldError({ rideType: 'hourly', dropoff: null }, 'hours', 'required')
    await expectFieldError({ rideType: 'hourly', dropoff: null, hours: 1 }, 'hours', 'too_small')
    await expectFieldError({ rideType: 'hourly', dropoff: null, hours: 13 }, 'hours', 'too_big')
  })

  it('requires a return time after the pickup for return trips', async () => {
    const out = localDateTime(3, '10:00')
    await expectFieldError({ rideType: 'return' }, 'returnDate', 'required')
    await expectFieldError({ rideType: 'return', returnDate: out.date }, 'returnTime', 'required')
    await expectFieldError({ rideType: 'return', returnDate: out.date, returnTime: '09:00' }, 'returnTime', 'before_pickup')
    await expectFieldError({ rideType: 'return', returnDate: out.date, returnTime: '10:00' }, 'returnTime', 'before_pickup')
  })

  it('rejects places outside the service area and identical places', async () => {
    await expectFieldError({ pickup: PLACES.paris }, 'pickup', 'outside_area')
    await expectFieldError({ dropoff: PLACES.paris }, 'dropoff', 'outside_area')
    await expectFieldError({ pickup: PLACES.sol, dropoff: { ...PLACES.sol, label: 'Same spot' } }, 'dropoff', 'same_as_pickup')
  })

  it('rejects impossible party sizes', async () => {
    await expectFieldError({ adults: 0 }, 'adults', 'too_small')
    await expectFieldError({ adults: 17 }, 'adults', 'too_big')
    await expectFieldError({ adults: 10, children: 10 }, 'adults', 'too_many_passengers')
    await expectFieldError({ luggage: -1 }, 'luggage', 'too_small')
    await expectFieldError({ adults: 2.5 }, 'adults', 'invalid')
  })

  it('rejects unknown ride types and malformed coordinates', async () => {
    await expectFieldError({ rideType: 'helicopter' }, 'rideType', 'invalid')
    await expectFieldError({ pickup: { label: 'Nowhere', lat: 123, lng: 0 } }, 'pickup.lat', 'too_big')
    await expectFieldError({ pickup: { label: '', lat: 40.4, lng: -3.7 } }, 'pickup.label', 'required')
  })
})
