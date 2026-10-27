import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import express from 'express'
import request from 'supertest'
import { afterEach, describe, expect, it } from 'vitest'
import { knownRoutesFromMadrid } from '../modules/places/catalog.js'
import { errorHandler } from './errors.js'
import { createRouteFinder, estimateRoute, haversineM, isInServiceArea } from './geo.js'
import { hashPassword, verifyPassword } from './password.js'
import { fareCents, justUnderCents, transferFareCents, type VehicleRates } from './pricing.js'
import { createRateLimiter } from './rate-limit.js'
import { generateReference, normalizeReference } from './reference.js'
import { zonedDateTimeToUtc } from './time.js'
import { atAirport, inPriceZone, insideM30, metresBeyondZone, metresFar } from './zone.js'

const MADRID = 'Europe/Madrid'
const SOL = { lat: 40.4169, lng: -3.7035 }
const TOLEDO = { lat: 39.8628, lng: -4.0273 }
const VALENCIA = { lat: 39.4699, lng: -0.3763 }

describe('zonedDateTimeToUtc', () => {
  it('applies the winter offset (UTC+1)', () => {
    expect(zonedDateTimeToUtc('2027-01-15', '10:00', MADRID)?.toISOString()).toBe('2027-01-15T09:00:00.000Z')
  })

  it('applies the summer offset (UTC+2)', () => {
    expect(zonedDateTimeToUtc('2027-07-15', '10:00', MADRID)?.toISOString()).toBe('2027-07-15T08:00:00.000Z')
  })

  it('handles the minutes either side of the spring clock change', () => {
    // Clocks jump from 02:00 to 03:00 on 28 March 2027.
    expect(zonedDateTimeToUtc('2027-03-28', '01:59', MADRID)?.toISOString()).toBe('2027-03-28T00:59:00.000Z')
    expect(zonedDateTimeToUtc('2027-03-28', '03:00', MADRID)?.toISOString()).toBe('2027-03-28T01:00:00.000Z')
  })

  it('rejects a local time that does not exist (inside the spring gap)', () => {
    expect(zonedDateTimeToUtc('2027-03-28', '02:30', MADRID)).toBeNull()
  })

  it('resolves a repeated autumn time to one of its two real instants', () => {
    // 02:30 happens twice on 25 October 2026.
    const result = zonedDateTimeToUtc('2026-10-25', '02:30', MADRID)?.toISOString()
    expect(['2026-10-25T00:30:00.000Z', '2026-10-25T01:30:00.000Z']).toContain(result)
  })

  it('crosses midnight correctly', () => {
    expect(zonedDateTimeToUtc('2027-07-01', '00:30', MADRID)?.toISOString()).toBe('2027-06-30T22:30:00.000Z')
  })

  it.each([
    ['2027-02-30', '10:00'],
    ['2027-13-01', '10:00'],
    ['2027-01-15', '24:00'],
    ['2027-01-15', '10:60'],
    ['15/01/2027', '10:00'],
    ['2027-01-15', '10am'],
    ['', ''],
  ])('rejects invalid input %s %s', (date, time) => {
    expect(zonedDateTimeToUtc(date, time, MADRID)).toBeNull()
  })
})

describe('pricing', () => {
  // The E-Class on the price list of 26 October 2026.
  const rates: VehicleRates = { zoneFareCents: 9000, perKmCents: 230, hourlyRateCents: 8500 }

  it('charges the fixed price inside the zone', () => {
    expect(transferFareCents(rates, 0)).toBe(9000)
  })

  it('adds each kilometre beyond the zone, rounded up to a whole euro', () => {
    // 90.00 + 2.30 x 64.321 km = 237.94 -> 238.00
    expect(transferFareCents(rates, 64_321)).toBe(23_800)
  })

  it('does not round an exact euro amount up', () => {
    expect(transferFareCents({ ...rates, perKmCents: 100 }, 50_000)).toBe(14_000)
  })

  it('prices a return trip as two transfers', () => {
    expect(fareCents(rates, { rideType: 'return', beyondZoneM: 64_321, hours: 0 })).toBe(47_600)
  })

  it('prices hourly hire by the hour, ignoring distance', () => {
    expect(fareCents(rates, { rideType: 'hourly', beyondZoneM: 999_000, hours: 3 })).toBe(25_500)
  })

  it('has no price for hourly hire without an hourly rate (agreed case by case)', () => {
    expect(fareCents({ ...rates, hourlyRateCents: null }, { rideType: 'hourly', beyondZoneM: 0, hours: 3 })).toBeNull()
    expect(fareCents({ ...rates, hourlyRateCents: null }, { rideType: 'one_way', beyondZoneM: 0, hours: 0 })).toBe(9000)
  })

  it.each(['one_way', 'local', 'city_to_city', 'airport'] as const)('prices %s as a single transfer', (rideType) => {
    expect(fareCents(rates, { rideType, beyondZoneM: 64_321, hours: 0 })).toBe(23_800)
  })

  it('charges the long-distance rate for the kilometres more than 120 km from Madrid', () => {
    // The V-Class: 3.00 per km beyond the M-30, 2.30 more than 120 km out.
    const van: VehicleRates = { zoneFareCents: 9000, perKmCents: 300, farPerKmCents: 230, hourlyRateCents: 9500 }
    // 90.00 + 3.00 x 100 km + 2.30 x 500 km = 1540.00
    expect(transferFareCents(van, 600_000, 500_000)).toBe(154_000)
    expect(fareCents(van, { rideType: 'return', beyondZoneM: 600_000, farM: 500_000, hours: 0 })).toBe(308_000)
    // Nothing that far: the price per km alone.
    expect(transferFareCents(van, 64_321)).toBe(28_300)
    // Without a long-distance rate the price per km applies all the way.
    expect(transferFareCents(rates, 600_000, 500_000)).toBe(transferFareCents(rates, 600_000))
    expect(transferFareCents({ ...rates, farPerKmCents: null }, 600_000, 500_000)).toBe(transferFareCents(rates, 600_000))
    // The far stretch is never more than the stretch beyond the zone.
    expect(transferFareCents(van, 10_000, 50_000)).toBe(transferFareCents(van, 10_000, 10_000))
  })

  it('never returns a negative or fractional amount', () => {
    expect(transferFareCents(rates, -500)).toBe(9000)
    expect(Number.isInteger(transferFareCents(rates, 12_345))).toBe(true)
  })

  it('quotes just under the round fare: 10 to 90 cents less, in steps of 10, the same for the same seed', () => {
    const quoted = Array.from({ length: 200 }, (_, index) => justUnderCents(9000, `vehicle|journey-${index}`))
    expect(quoted.every((cents) => cents >= 8910 && cents <= 8990 && cents % 10 === 0)).toBe(true)
    // Spread over the whole range, not stuck on one figure.
    expect(new Set(quoted).size).toBe(9)
    expect(justUnderCents(30_000, 'maybach|sol-barajas')).toBe(justUnderCents(30_000, 'maybach|sol-barajas'))
    expect(justUnderCents(30_000, 'maybach|sol-barajas')).toBeLessThan(30_000)
    // A euro or less is left alone.
    expect(justUnderCents(100, 'x')).toBe(100)
  })
})

describe('price zone (M-30 and the airport)', () => {
  const place = (lat: number, lng: number) => ({ lat, lng })
  const SOL = place(40.4169, -3.7035)
  const T4 = place(40.4917, -3.5931)
  const T1 = place(40.4675, -3.5701)
  const TOLEDO = place(39.8628, -4.0273)

  it.each([
    ['Puerta del Sol', SOL],
    ['Bernabéu', place(40.4531, -3.6883)],
    ['Plaza de Castilla', place(40.4666, -3.689)],
    ['Atocha', place(40.4065, -3.6893)],
    ['Moncloa', place(40.4351, -3.7193)],
    ['Matadero', place(40.392, -3.6975)],
  ])('%s is inside the M-30', (_name, point) => {
    expect(insideM30(point)).toBe(true)
  })

  it.each([
    ['Usera, across the river', place(40.387, -3.7065)],
    ['IFEMA', place(40.4637, -3.6166)],
    ['Las Tablas', place(40.5065, -3.6697)],
    ['Casa de Campo', place(40.4093, -3.7621)],
    ['Getafe', place(40.3057, -3.7329)],
  ])('%s is outside the M-30', (_name, point) => {
    expect(insideM30(point)).toBe(false)
    expect(atAirport(point)).toBe(false)
  })

  it('knows the airport terminals', () => {
    expect(atAirport(T4)).toBe(true)
    expect(atAirport(T1)).toBe(true)
    expect(inPriceZone(T4)).toBe(true)
  })

  it('counts nothing beyond the zone inside the M-30 or between it and the airport', () => {
    expect(metresBeyondZone(SOL, place(40.4531, -3.6883), 6_000)).toBe(0)
    expect(metresBeyondZone(T4, SOL, 17_000)).toBe(0)
    expect(metresBeyondZone(SOL, T1, 15_000)).toBe(0)
  })

  it('counts the share of the journey beyond the M-30', () => {
    // Sol to Toledo: about 4 km of the straight line are inside the M-30, the rest is beyond it.
    const beyond = metresBeyondZone(SOL, TOLEDO, 72_000)
    expect(beyond).toBeGreaterThan(66_000)
    expect(beyond).toBeLessThan(70_000)
    // The airport to Toledo: all of it beyond the zone, bar the last stretch out of the airport.
    expect(metresBeyondZone(T4, TOLEDO, 85_000)).toBeGreaterThan(82_000)
  })

  it('counts the share of the journey more than 120 km from the centre of Madrid', () => {
    // Toledo (about 70 km) and Segovia (about 70 km) are inside the radius.
    expect(metresFar(SOL, TOLEDO, 72_000)).toBe(0)
    expect(metresFar(TOLEDO, place(40.9429, -4.1088), 160_000)).toBe(0)
    // Sol to Barcelona (about 505 km in a straight line): all but the first 120 km of it.
    const BARCELONA = place(41.3874, 2.1686)
    const far = metresFar(SOL, BARCELONA, 620_000)
    expect(far).toBeGreaterThan(465_000)
    expect(far).toBeLessThan(475_000)
    expect(far).toBeLessThan(metresBeyondZone(SOL, BARCELONA, 620_000))
    // Either way round.
    expect(metresFar(BARCELONA, SOL, 620_000)).toBe(far)
  })
})

describe('geo', () => {
  let server: Server | undefined
  afterEach(() => server?.close())

  const listen = (handler: Parameters<typeof createServer>[1]) =>
    new Promise<string>((resolve) => {
      server = createServer(handler)
      server.listen(0, '127.0.0.1', () => resolve(`http://127.0.0.1:${(server!.address() as AddressInfo).port}`))
    })

  it('measures great-circle distance', () => {
    expect(haversineM(SOL, TOLEDO) / 1000).toBeCloseTo(67.5, 0)
    expect(haversineM(SOL, SOL)).toBe(0)
  })

  it('estimates road distance within 15% of real routes', () => {
    // Real road distances: Madrid-Toledo ~73 km, Madrid-Valencia ~357 km.
    const toledo = estimateRoute(SOL, TOLEDO)
    const valencia = estimateRoute(SOL, VALENCIA)
    expect(Math.abs(toledo.distanceM / 1000 - 73) / 73).toBeLessThan(0.15)
    expect(Math.abs(valencia.distanceM / 1000 - 357) / 357).toBeLessThan(0.15)
    expect(toledo.source).toBe('estimate')
    expect(toledo.durationS).toBeGreaterThan(40 * 60)
    expect(toledo.durationS).toBeLessThan(80 * 60)
  })

  describe('measured routes', () => {
    const known = knownRoutesFromMadrid()
    const km = (from: typeof SOL, to: typeof SOL) => estimateRoute(from, to, known).distanceM / 1000
    const ATOCHA = { lat: 40.4066, lng: -3.6892 }
    const T4 = { lat: 40.4917, lng: -3.5931 }
    const BARCELONA = { lat: 41.3874, lng: 2.1686 }

    it('uses the measured road distance between central Madrid and a listed city, either way round', () => {
      // Measured: 73.0 km (the generic estimate alone gives about 81 km).
      expect(km(SOL, TOLEDO)).toBeCloseTo(73, 0)
      expect(km(TOLEDO, SOL)).toBeCloseTo(73, 0)
      expect(km(SOL, VALENCIA)).toBeCloseTo(356.7, 0)
    })

    it('scales the measured route to the actual end points', () => {
      // Atocha is 1.5 km closer to Toledo than the city centre: the real road distance is about 71.6 km.
      const fromAtocha = km(ATOCHA, TOLEDO)
      expect(fromAtocha).toBeGreaterThan(70)
      expect(fromAtocha).toBeLessThan(73)
    })

    it('covers airport transfers, where the detour is largest', () => {
      // Measured: 19.1 km by road for 12.5 km in a straight line.
      expect(km(SOL, T4)).toBeCloseTo(19.1, 0)
      expect(km(T4, SOL)).toBeCloseTo(19.1, 0)
      expect(estimateRoute(SOL, T4, known).durationS / 60).toBeCloseTo(22, 0)
    })

    it('falls back to the generic estimate for journeys it has not measured', () => {
      expect(estimateRoute(VALENCIA, BARCELONA, known)).toEqual(estimateRoute(VALENCIA, BARCELONA))
      // From the airport (not central Madrid) to Toledo is not a measured route either.
      expect(estimateRoute(T4, TOLEDO, known)).toEqual(estimateRoute(T4, TOLEDO))
    })

    it('still labels the result an estimate', () => {
      expect(estimateRoute(SOL, TOLEDO, known).source).toBe('estimate')
    })
  })

  it('knows the service area', () => {
    expect(isInServiceArea(SOL)).toBe(true)
    expect(isInServiceArea({ lat: 48.8566, lng: 2.3522 })).toBe(false)
  })

  it('uses the estimate when no routing server is configured', async () => {
    const route = await createRouteFinder('')(SOL, TOLEDO)
    expect(route.source).toBe('estimate')
  })

  it('uses road distances from an OSRM-compatible server, and caches them', async () => {
    const requests: string[] = []
    const url = await listen((req, res) => {
      requests.push(req.url ?? '')
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ code: 'Ok', routes: [{ distance: 73031.4, duration: 3480.9 }] }))
    })
    const findRoute = createRouteFinder(`${url}/`)

    const first = await findRoute(SOL, TOLEDO)
    const second = await findRoute(SOL, TOLEDO)

    expect(first).toEqual({ distanceM: 73_031, durationS: 3481, source: 'road' })
    expect(second).toEqual(first)
    expect(requests).toEqual(['/route/v1/driving/-3.7035,40.4169;-4.0273,39.8628?overview=false'])
  })

  it('falls back to the estimate when the routing server fails', async () => {
    const url = await listen((_req, res) => {
      res.statusCode = 500
      res.end('boom')
    })
    const route = await createRouteFinder(url)(SOL, TOLEDO)
    expect(route.source).toBe('estimate')
    expect(route.distanceM).toBeGreaterThan(60_000)
  })

  it('falls back to the estimate when the server finds no route', async () => {
    const url = await listen((_req, res) => {
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ code: 'NoRoute', routes: [] }))
    })
    expect((await createRouteFinder(url)(SOL, TOLEDO)).source).toBe('estimate')
  })
})

describe('booking references', () => {
  it('generates references in the expected format', () => {
    for (let index = 0; index < 200; index += 1) {
      expect(generateReference()).toMatch(/^LX-[A-HJ-NP-Z2-9]{6}$/)
    }
  })

  it('does not repeat in a small sample', () => {
    const sample = new Set(Array.from({ length: 500 }, generateReference))
    expect(sample.size).toBe(500)
  })

  it.each([
    ['LX-7K3M9Q', 'LX-7K3M9Q'],
    ['lx-7k3m9q', 'LX-7K3M9Q'],
    ['lx7k3m9q', 'LX-7K3M9Q'],
    ['  LX 7K3 M9Q ', 'LX-7K3M9Q'],
    ['7k3m9q', 'LX-7K3M9Q'],
    ['LXABCD', 'LX-LXABCD'],
  ])('normalises %s', (input, expected) => {
    expect(normalizeReference(input)).toBe(expected)
  })
})

describe('passwords', () => {
  it('verifies the right password and rejects the wrong one', async () => {
    const hash = await hashPassword('correct horse battery staple')
    expect(hash.startsWith('scrypt$')).toBe(true)
    expect(hash).not.toContain('correct horse')
    expect(await verifyPassword('correct horse battery staple', hash)).toBe(true)
    expect(await verifyPassword('correct horse battery stapl', hash)).toBe(false)
  })

  it('salts each hash', async () => {
    expect(await hashPassword('same-password')).not.toBe(await hashPassword('same-password'))
  })

  it('rejects malformed stored hashes instead of throwing', async () => {
    expect(await verifyPassword('anything', '')).toBe(false)
    expect(await verifyPassword('anything', 'plaintext')).toBe(false)
    expect(await verifyPassword('anything', 'bcrypt$10$abc$def$ghi$jkl')).toBe(false)
  })
})

describe('rate limiter', () => {
  const appWith = (disabled: boolean) => {
    const app = express()
    const rateLimit = createRateLimiter(disabled)
    app.get('/limited', rateLimit({ name: 'test', windowMs: 60_000, limit: 3 }), (_req, res) => res.json({ ok: true }))
    app.get('/other', rateLimit({ name: 'other', windowMs: 60_000, limit: 1 }), (_req, res) => res.json({ ok: true }))
    app.use(errorHandler)
    return app
  }

  it('allows requests up to the limit, then answers 429 with Retry-After', async () => {
    const app = appWith(false)
    for (let index = 0; index < 3; index += 1) {
      expect((await request(app).get('/limited')).status).toBe(200)
    }
    const blocked = await request(app).get('/limited')
    expect(blocked.status).toBe(429)
    expect(blocked.body.error.code).toBe('RATE_LIMITED')
    expect(Number(blocked.headers['retry-after'])).toBeGreaterThan(0)
  })

  it('keeps separate counters per limiter', async () => {
    const app = appWith(false)
    expect((await request(app).get('/other')).status).toBe(200)
    expect((await request(app).get('/other')).status).toBe(429)
    expect((await request(app).get('/limited')).status).toBe(200)
  })

  it('does nothing when disabled', async () => {
    const app = appWith(true)
    for (let index = 0; index < 5; index += 1) {
      expect((await request(app).get('/other')).status).toBe(200)
    }
  })
})
