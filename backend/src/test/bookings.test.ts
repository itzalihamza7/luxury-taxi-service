import { eq } from 'drizzle-orm'
import request from 'supertest'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../db/client.js'
import { bookings, quotes } from '../db/schema.js'
import { bookRide, buildApp, CONTACT, registerAgent, requestQuote, resetDatabase } from './helpers.js'

const app = buildApp()

beforeEach(resetDatabase)

describe('creating a booking', () => {
  it('lets a guest book without an account', async () => {
    const { response, choice } = await bookRide(app, { booking: { flightNumber: 'IB3170', contact: { ...CONTACT, company: 'Acme SL', notes: 'Two child seats please' } } })

    expect(response.status).toBe(201)
    expect(response.body.payment).toBeNull()
    expect(response.body.booking).toMatchObject({
      status: 'pending',
      rideType: 'one_way',
      paymentMethod: 'chauffeur',
      paymentStatus: 'unpaid',
      totalCents: choice.totalCents,
      currency: 'EUR',
      flightNumber: 'IB3170',
      adults: 2,
      luggage: 2,
      isGuest: true,
      canCancel: true,
      contact: { name: 'Elena Marín', email: 'elena@example.com', phone: '+34 600 111 222', company: 'Acme SL', notes: 'Two child seats please' },
    })
    expect(response.body.booking.reference).toMatch(/^LX-[A-HJ-NP-Z2-9]{6}$/)
    expect(response.body.booking.pickup.label).toContain('Barajas')
    expect(response.body.booking).not.toHaveProperty('id')
  })

  it('books with a phone number of another country, written any way, and finds the booking by it', async () => {
    const { response } = await bookRide(app, { booking: { contact: { ...CONTACT, phone: '‪+49 (0) 151 / 123 456 78‬' } } })

    expect(response.status).toBe(201)
    expect(response.body.booking.contact.phone).toBe('+49 151 123 456 78')
    const found = await request(app).post('/api/bookings/lookup').send({ reference: response.body.booking.reference, phone: '0049 151 12345678' })
    expect(found.status).toBe(200)
  })

  it('takes the price from the quote, never from the request', async () => {
    const quote = await requestQuote(app)
    const choice = quote.options.find((option) => option.available)!
    const response = await request(app)
      .post('/api/bookings')
      .send({ quoteId: quote.id, vehicleId: choice.vehicleId, contact: CONTACT, paymentMethod: 'chauffeur', acceptTerms: true, totalCents: 1, status: 'confirmed', paymentStatus: 'paid' })

    expect(response.status).toBe(201)
    expect(response.body.booking).toMatchObject({ totalCents: choice.totalCents, status: 'pending', paymentStatus: 'unpaid' })
  })

  it('returns the original booking when the same quote is submitted twice', async () => {
    const { response: first, quote, choice } = await bookRide(app)
    const second = await request(app)
      .post('/api/bookings')
      .send({ quoteId: quote.id, vehicleId: choice.vehicleId, contact: CONTACT, paymentMethod: 'chauffeur', acceptTerms: true })

    expect(second.status).toBe(200)
    expect(second.body.booking.reference).toBe(first.body.booking.reference)
    expect(await db.select().from(bookings)).toHaveLength(1)
  })

  it('creates only one booking when the same quote is submitted concurrently', async () => {
    const quote = await requestQuote(app)
    const choice = quote.options.find((option) => option.available)!
    const payload = { quoteId: quote.id, vehicleId: choice.vehicleId, contact: CONTACT, paymentMethod: 'chauffeur', acceptTerms: true }

    const responses = await Promise.all(Array.from({ length: 5 }, () => request(app).post('/api/bookings').send(payload)))

    expect(responses.every((response) => response.status === 200 || response.status === 201)).toBe(true)
    expect(new Set(responses.map((response) => response.body.booking.reference)).size).toBe(1)
    expect(await db.select().from(bookings)).toHaveLength(1)
  })

  it('refuses a vehicle that is too small for the party', async () => {
    const quote = await requestQuote(app, { adults: 6 })
    const sedan = quote.options.find((option) => option.vehicle.slug === 'mercedes-e-class')!
    const response = await request(app)
      .post('/api/bookings')
      .send({ quoteId: quote.id, vehicleId: sedan.vehicleId, contact: CONTACT, paymentMethod: 'chauffeur', acceptTerms: true })

    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe('VEHICLE_UNAVAILABLE')
  })

  it('refuses unknown and expired quotes', async () => {
    const quote = await requestQuote(app)
    const choice = quote.options.find((option) => option.available)!
    const payload = { vehicleId: choice.vehicleId, contact: CONTACT, paymentMethod: 'chauffeur', acceptTerms: true }

    const unknown = await request(app).post('/api/bookings').send({ ...payload, quoteId: '00000000-0000-4000-8000-000000000000' })
    expect(unknown.status).toBe(404)
    expect(unknown.body.error.code).toBe('QUOTE_NOT_FOUND')

    await db.update(quotes).set({ expiresAt: new Date(Date.now() - 1000) }).where(eq(quotes.id, quote.id))
    const expired = await request(app).post('/api/bookings').send({ ...payload, quoteId: quote.id })
    expect(expired.status).toBe(410)
    expect(expired.body.error.code).toBe('QUOTE_EXPIRED')
    expect(await db.select().from(bookings)).toHaveLength(0)
  })

  it('re-checks the minimum notice at the moment of booking', async () => {
    const quote = await requestQuote(app)
    await db.update(quotes).set({ pickupAt: new Date(Date.now() + 30 * 60_000) }).where(eq(quotes.id, quote.id))

    const choice = quote.options.find((option) => option.available)!
    const response = await request(app)
      .post('/api/bookings')
      .send({ quoteId: quote.id, vehicleId: choice.vehicleId, contact: CONTACT, paymentMethod: 'chauffeur', acceptTerms: true })
    expect(response.status).toBe(409)
    expect(response.body.error.code).toBe('LEAD_TIME')
  })

  it('offers online payment only when a provider is configured', async () => {
    const { response } = await bookRide(app, { booking: { paymentMethod: 'online' } })
    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe('PAYMENTS_UNAVAILABLE')
    expect(await db.select().from(bookings)).toHaveLength(0)
  })

  it.each([
    [{ acceptTerms: false }, 'acceptTerms'],
    [{ contact: { ...CONTACT, email: 'nope' } }, 'contact.email'],
    [{ contact: { ...CONTACT, phone: '12' } }, 'contact.phone'],
    [{ contact: { ...CONTACT, name: '' } }, 'contact.name'],
    [{ paymentMethod: 'bitcoin' }, 'paymentMethod'],
    [{ quoteId: 'not-a-uuid' }, 'quoteId'],
  ])('validates the request: %j', async (override, field) => {
    const { response } = await bookRide(app, { booking: override })
    expect(response.status).toBe(400)
    expect(response.body.error.fields).toHaveProperty(field)
  })
})

describe('customer accounts', () => {
  it('links a booking made while signed in and lists it under "my bookings"', async () => {
    const agent = await registerAgent(app)
    const { response } = await bookRide(app, { agent })
    await bookRide(app) // someone else's guest booking

    expect(response.body.booking.isGuest).toBe(false)

    const mine = await agent.get('/api/bookings')
    expect(mine.status).toBe(200)
    expect(mine.body.bookings).toHaveLength(1)
    expect(mine.body.bookings[0].reference).toBe(response.body.booking.reference)

    const detail = await agent.get(`/api/bookings/${response.body.booking.reference}`)
    expect(detail.body.booking.reference).toBe(response.body.booking.reference)
  })

  it('keeps bookings private to their owner', async () => {
    const owner = await registerAgent(app, 'owner@example.com')
    const stranger = await registerAgent(app, 'stranger@example.com')
    const { response } = await bookRide(app, { agent: owner })
    const reference = response.body.booking.reference

    expect((await request(app).get('/api/bookings')).status).toBe(401)
    expect((await request(app).get(`/api/bookings/${reference}`)).status).toBe(401)
    expect((await stranger.get(`/api/bookings/${reference}`)).status).toBe(403)
    expect((await stranger.get('/api/bookings')).body.bookings).toEqual([])
    expect((await stranger.post(`/api/bookings/${reference}/cancel`).send({})).status).toBe(404)
  })
})

describe('tracking a booking as a guest', () => {
  it('finds the booking with the reference and the booking email', async () => {
    const { response } = await bookRide(app)
    const reference: string = response.body.booking.reference

    const found = await request(app).post('/api/bookings/lookup').send({ reference, email: CONTACT.email })
    expect(found.status).toBe(200)
    expect(found.body.booking.reference).toBe(reference)

    // Forgiving about how the customer types either value.
    const sloppy = await request(app)
      .post('/api/bookings/lookup')
      .send({ reference: ` ${reference.toLowerCase().replace('-', '')} `, email: '  ELENA@Example.com ' })
    expect(sloppy.status).toBe(200)
  })

  it('gives the same answer for a wrong email and an unknown reference', async () => {
    const { response } = await bookRide(app)
    const wrongEmail = await request(app).post('/api/bookings/lookup').send({ reference: response.body.booking.reference, email: 'other@example.com' })
    const unknown = await request(app).post('/api/bookings/lookup').send({ reference: 'LX-ZZZZZZ', email: CONTACT.email })

    expect(wrongEmail.status).toBe(404)
    expect(unknown.status).toBe(404)
    expect(wrongEmail.body).toEqual(unknown.body)
  })
})

describe('cancelling', () => {
  it('lets a guest cancel with their email, and is safe to repeat', async () => {
    const { response } = await bookRide(app)
    const reference = response.body.booking.reference

    const cancelled = await request(app).post(`/api/bookings/${reference}/cancel`).send({ email: CONTACT.email })
    expect(cancelled.status).toBe(200)
    expect(cancelled.body.booking).toMatchObject({ status: 'cancelled', canCancel: false })

    const again = await request(app).post(`/api/bookings/${reference}/cancel`).send({ email: CONTACT.email })
    expect(again.status).toBe(200)
    expect(again.body.booking.status).toBe('cancelled')
  })

  it('lets the signed-in owner cancel without re-entering their email', async () => {
    const agent = await registerAgent(app)
    const { response } = await bookRide(app, { agent })
    const cancelled = await agent.post(`/api/bookings/${response.body.booking.reference}/cancel`).send({})
    expect(cancelled.body.booking.status).toBe('cancelled')
  })

  it('refuses without proof of ownership', async () => {
    const { response } = await bookRide(app)
    const reference = response.body.booking.reference

    expect((await request(app).post(`/api/bookings/${reference}/cancel`).send({})).status).toBe(404)
    expect((await request(app).post(`/api/bookings/${reference}/cancel`).send({ email: 'other@example.com' })).status).toBe(404)
    const [stored] = await db.select().from(bookings)
    expect(stored?.status).toBe('pending')
  })

  it('closes online cancellation 24 hours before pickup', async () => {
    const { response } = await bookRide(app)
    const reference = response.body.booking.reference
    await db.update(bookings).set({ pickupAt: new Date(Date.now() + 23 * 3_600_000) })

    const tooLate = await request(app).post(`/api/bookings/${reference}/cancel`).send({ email: CONTACT.email })
    expect(tooLate.status).toBe(409)
    expect(tooLate.body.error.code).toBe('CANCEL_WINDOW_PASSED')

    const lookup = await request(app).post('/api/bookings/lookup').send({ reference, email: CONTACT.email })
    expect(lookup.body.booking).toMatchObject({ status: 'pending', canCancel: false })
  })

  it('does not allow cancelling a completed ride', async () => {
    const { response } = await bookRide(app)
    await db.update(bookings).set({ status: 'completed' })
    const result = await request(app).post(`/api/bookings/${response.body.booking.reference}/cancel`).send({ email: CONTACT.email })
    expect(result.status).toBe(409)
  })
})
