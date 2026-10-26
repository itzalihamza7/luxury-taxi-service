import request from 'supertest'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../db/client.js'
import { contactMessages, newsletterSubscribers } from '../db/schema.js'
import { adminAgent, bookRide, buildApp, CONTACT, localDateTime, registerAgent, resetDatabase } from './helpers.js'

const app = buildApp()

beforeEach(resetDatabase)

describe('admin access control', () => {
  it.each(['/api/admin/summary', '/api/admin/bookings', '/api/admin/messages'])('protects %s', async (path) => {
    expect((await request(app).get(path)).status).toBe(401)
    const customer = await registerAgent(app)
    const response = await customer.get(path)
    expect(response.status).toBe(403)
    expect(response.body.error.code).toBe('FORBIDDEN')
  })

  it('does not let a customer change a booking', async () => {
    const customer = await registerAgent(app)
    const { response } = await bookRide(app, { agent: customer })
    const attempt = await customer.patch(`/api/admin/bookings/${response.body.booking.reference}`).send({ status: 'confirmed', paymentStatus: 'paid' })
    expect(attempt.status).toBe(403)
  })
})

describe('admin bookings', () => {
  it('lists, filters, searches and paginates', async () => {
    const admin = await adminAgent(app)
    const first = (await bookRide(app)).response.body.booking.reference as string
    await bookRide(app, { booking: { contact: { ...CONTACT, name: 'Jorge Peña', email: 'jorge@example.com' } } })
    await bookRide(app, { booking: { contact: { ...CONTACT, name: 'Ana 100% Real', email: 'ana@example.com' } } })

    const all = await admin.get('/api/admin/bookings')
    expect(all.body).toMatchObject({ total: 3, page: 1, pageSize: 20 })
    // The operator sees guest bookings and contact details.
    expect(all.body.bookings[0].contact.email).toBeDefined()

    expect((await admin.get('/api/admin/bookings').query({ q: 'jorge' })).body.total).toBe(1)
    expect((await admin.get('/api/admin/bookings').query({ q: first.toLowerCase() })).body.total).toBe(1)
    // Wildcards in the search are literal, not patterns.
    expect((await admin.get('/api/admin/bookings').query({ q: '100%' })).body.total).toBe(1)
    expect((await admin.get('/api/admin/bookings').query({ q: '%' })).body.total).toBe(1)
    expect((await admin.get('/api/admin/bookings').query({ status: 'confirmed' })).body.total).toBe(0)

    const page = await admin.get('/api/admin/bookings').query({ page: 2, pageSize: 2 })
    expect(page.body.bookings).toHaveLength(1)
    expect(page.body.total).toBe(3)
  })

  it('lists the rides still to come, soonest first', async () => {
    const admin = await adminAgent(app)
    const book = async (daysAhead: number) => {
      const when = localDateTime(daysAhead)
      return (await bookRide(app, { quote: { pickupDate: when.date, pickupTime: when.time } })).response.body.booking.reference as string
    }
    const later = await book(9)
    const sooner = await book(2)
    const cancelled = await book(4)
    const finished = await book(5)
    await admin.patch(`/api/admin/bookings/${cancelled}`).send({ status: 'cancelled', note: 'The customer changed their plans.' })
    await admin.patch(`/api/admin/bookings/${finished}`).send({ status: 'confirmed' })
    await admin.patch(`/api/admin/bookings/${finished}`).send({ status: 'completed' })

    const upcoming = await admin.get('/api/admin/bookings').query({ view: 'upcoming' })
    expect(upcoming.body.total).toBe(2)
    expect(upcoming.body.bookings.map((booking: { reference: string }) => booking.reference)).toEqual([sooner, later])
    // Without the view, the newest booking comes first.
    expect((await admin.get('/api/admin/bookings')).body.bookings[0].reference).toBe(finished)
    expect((await admin.get('/api/admin/bookings').query({ view: 'everything' })).status).toBe(400)
  })

  it('moves a booking through its lifecycle and blocks impossible changes', async () => {
    const admin = await adminAgent(app)
    const reference = (await bookRide(app)).response.body.booking.reference as string
    const patch = (body: Record<string, unknown>) => admin.patch(`/api/admin/bookings/${reference}`).send(body)

    expect((await patch({ status: 'completed' })).body.error.code).toBe('INVALID_STATUS_CHANGE')
    expect((await patch({ status: 'confirmed' })).body.booking.status).toBe('confirmed')
    expect((await patch({ status: 'in_progress' })).body.booking.status).toBe('in_progress')
    expect((await patch({ status: 'pending' })).status).toBe(409)
    expect((await patch({ status: 'completed', paymentStatus: 'paid' })).body.booking).toMatchObject({ status: 'completed', paymentStatus: 'paid' })
    expect((await patch({ status: 'cancelled', note: 'Too late to cancel.' })).status).toBe(409)
    expect((await patch({ paymentStatus: 'unpaid' })).body.booking.paymentStatus).toBe('unpaid')
    expect((await patch({})).status).toBe(400)
    expect((await admin.patch('/api/admin/bookings/LX-ZZZZZZ').send({ status: 'confirmed' })).status).toBe(404)

    // The customer sees the new status when tracking.
    const tracked = await request(app).post('/api/bookings/lookup').send({ reference, email: CONTACT.email })
    expect(tracked.body.booking.status).toBe('completed')
  })

  it('summarises activity', async () => {
    const admin = await adminAgent(app)
    const reference = (await bookRide(app)).response.body.booking.reference as string
    await bookRide(app)
    await admin.patch(`/api/admin/bookings/${reference}`).send({ status: 'confirmed' })
    await db.insert(contactMessages).values({ name: 'Luis', email: 'luis@example.com', subject: 'Wedding', message: 'Do you offer wedding cars?' })
    await db.insert(newsletterSubscribers).values({ email: 'news@example.com' })

    const summary = await admin.get('/api/admin/summary')
    expect(summary.body).toEqual({
      bookings: { pending: 1, confirmed: 1, in_progress: 0, completed: 0, cancelled: 0 },
      upcoming: 2,
      messages: 1,
      subscribers: 1,
    })

    const messages = await admin.get('/api/admin/messages')
    expect(messages.body.total).toBe(1)
    expect(messages.body.messages[0]).toMatchObject({ name: 'Luis', subject: 'Wedding' })
  })
})

describe('contact form and newsletter', () => {
  const MESSAGE = { name: 'Luis Ortega', email: 'Luis@Example.com', phone: '', subject: 'Wedding car', message: 'Do you offer cars for weddings in June?', locale: 'es' }

  it('stores a contact message', async () => {
    const response = await request(app).post('/api/contact').send(MESSAGE)
    expect(response.status).toBe(201)
    const [stored] = await db.select().from(contactMessages)
    expect(stored).toMatchObject({ name: 'Luis Ortega', email: 'luis@example.com', phone: null, locale: 'es' })
  })

  it('silently drops submissions that fill the hidden honeypot field', async () => {
    const response = await request(app).post('/api/contact').send({ ...MESSAGE, website: 'https://spam.example' })
    expect(response.status).toBe(201)
    expect(await db.select().from(contactMessages)).toHaveLength(0)
  })

  it('validates the message', async () => {
    const response = await request(app).post('/api/contact').send({ ...MESSAGE, email: 'x', message: 'Hi' })
    expect(response.status).toBe(400)
    expect(response.body.error.fields).toMatchObject({ email: 'invalid_email', message: 'too_short' })
  })

  it('subscribes an email once, without revealing whether it was already subscribed', async () => {
    const first = await request(app).post('/api/newsletter').send({ email: 'Reader@Example.com', locale: 'es' })
    const second = await request(app).post('/api/newsletter').send({ email: 'reader@example.com' })
    expect(first.status).toBe(201)
    expect(second.status).toBe(201)
    expect(second.body).toEqual(first.body)

    const rows = await db.select().from(newsletterSubscribers)
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ email: 'reader@example.com', locale: 'es' })
    expect((await request(app).post('/api/newsletter').send({ email: 'nope' })).status).toBe(400)
  })
})
