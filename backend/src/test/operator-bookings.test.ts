import request from 'supertest'
import { beforeEach, describe, expect, it } from 'vitest'
import { samePhone } from '../lib/phone.js'
import { adminAgent, bookRide, buildApp, quotePayload, registerAgent, resetDatabase } from './helpers.js'

const app = buildApp()

beforeEach(resetDatabase)

type Agent = Awaited<ReturnType<typeof adminAgent>>

/** Price a journey as the operator and take the first vehicle that fits. */
async function operatorQuote(admin: Agent, overrides: Record<string, unknown> = {}) {
  const response = await admin.post('/api/admin/quotes').send(quotePayload(overrides))
  if (response.status !== 201) throw new Error(`operator quote failed: ${response.status} ${JSON.stringify(response.body)}`)
  const quote = response.body.quote as { id: string; options: { vehicleId: string; available: boolean; totalCents: number }[] }
  const choice = quote.options.find((option) => option.available)
  if (!choice) throw new Error('no vehicle available')
  return { quote, choice }
}

/** Enter a booking for a customer who phoned. */
async function phoneBooking(admin: Agent, contact: Record<string, unknown>, extra: Record<string, unknown> = {}) {
  const { quote, choice } = await operatorQuote(admin)
  const response = await admin.post('/api/admin/bookings').send({ quoteId: quote.id, vehicleId: choice.vehicleId, contact: { name: 'Marta Soler', ...contact }, ...extra })
  return { response, choice }
}

/** The clock time in Madrid `minutes` from now, as the date and time fields of the form. */
function madridIn(minutes: number): { pickupDate: string; pickupTime: string } {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(Date.now() + minutes * 60_000))
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? ''
  return { pickupDate: `${part('year')}-${part('month')}-${part('day')}`, pickupTime: `${part('hour')}:${part('minute')}` }
}

describe('comparing phone numbers', () => {
  it('treats different ways of writing a number as the same number', () => {
    expect(samePhone('+34 600 111 222', '600111222')).toBe(true)
    expect(samePhone('0034 600-111-222', '+34600111222')).toBe(true)
    expect(samePhone('(+34) 600.111.222', '34 600 111 222')).toBe(true)
  })

  it('keeps different numbers apart', () => {
    expect(samePhone('+34 600 111 222', '+34 600 111 223')).toBe(false)
    expect(samePhone('+34 600 111 222', null)).toBe(false)
    expect(samePhone('', '')).toBe(false)
    // Too short to identify anyone.
    expect(samePhone('1222', '1222')).toBe(false)
  })
})

describe('bookings taken by an operator', () => {
  it('is for operators only', async () => {
    expect((await request(app).post('/api/admin/quotes').send(quotePayload())).status).toBe(401)
    expect((await request(app).post('/api/admin/bookings').send({})).status).toBe(401)
    expect((await request(app).get('/api/admin/customers/match?phone=600111222')).status).toBe(401)
    const customer = await registerAgent(app)
    expect((await customer.post('/api/admin/quotes').send(quotePayload())).status).toBe(403)
    expect((await customer.post('/api/admin/bookings').send({})).status).toBe(403)
  })

  it('may be for a ride that leaves right away, which customers cannot book themselves', async () => {
    const admin = await adminAgent(app)
    const soon = madridIn(20)
    const customer = await request(app).post('/api/quotes').send(quotePayload(soon))
    expect(customer.body.error.fields).toMatchObject({ pickupTime: 'lead_time' })

    expect((await admin.post('/api/admin/quotes').send(quotePayload(soon))).status).toBe(201)
    const past = await admin.post('/api/admin/quotes').send(quotePayload(madridIn(-90)))
    expect(past.body.error.fields).toMatchObject({ pickupTime: 'in_past' })

    const { quote, choice } = await operatorQuote(admin, soon)
    const booked = await admin.post('/api/admin/bookings').send({ quoteId: quote.id, vehicleId: choice.vehicleId, contact: { name: 'Marta Soler', phone: '+34 600 111 222' } })
    expect(booked.status).toBe(201)
  })

  it('needs a name and one way to reach the customer', async () => {
    const admin = await adminAgent(app)
    const nothing = await phoneBooking(admin, {})
    expect(nothing.response.status).toBe(400)
    // Reported on the phone field: either that or an email address is needed.
    expect(nothing.response.body.error.fields).toMatchObject({ 'contact.phone': 'required' })

    const invalid = await phoneBooking(admin, { name: '', email: 'not-an-email', phone: 'call me' })
    expect(invalid.response.body.error.fields).toMatchObject({ 'contact.name': 'required', 'contact.email': 'invalid_email', 'contact.phone': 'invalid_phone' })
  })

  it('starts out confirmed, with the calculated price, and the customer can follow it by phone number', async () => {
    const admin = await adminAgent(app)
    const { response, choice } = await phoneBooking(admin, { phone: '+34 600 111 222' }, { flightNumber: 'IB3170' })
    expect(response.status).toBe(201)
    expect(response.body.account).toBeNull()
    const booking = response.body.booking
    expect(booking).toMatchObject({
      status: 'confirmed',
      source: 'operator',
      isGuest: true,
      paymentMethod: 'chauffeur',
      paymentStatus: 'unpaid',
      totalCents: choice.totalCents,
      flightNumber: 'IB3170',
      contact: { name: 'Marta Soler', email: null, phone: '+34 600 111 222' },
    })

    // The customer wrote the number differently; it is still theirs.
    const track = (body: Record<string, unknown>) => request(app).post('/api/bookings/lookup').send({ reference: booking.reference, ...body })
    expect((await track({ phone: '600 111 222' })).body.booking.reference).toBe(booking.reference)
    expect((await track({ phone: '0034600111222', email: '' })).status).toBe(200)
    expect((await track({ phone: '+34 600 111 223' })).status).toBe(404)
    expect((await track({ email: 'marta@example.com' })).status).toBe(404)
    expect((await track({})).body.error.fields).toMatchObject({ email: 'required' })

    // It is listed with the others in the console.
    const listed = await admin.get('/api/admin/bookings').query({ q: '600 111 222' })
    expect(listed.body.bookings[0]).toMatchObject({ reference: booking.reference, source: 'operator' })
  })

  it('takes an email instead of a phone number, and a price agreed with the customer', async () => {
    const admin = await adminAgent(app)
    const { response } = await phoneBooking(admin, { email: 'Marta@Example.com' }, { priceCents: 12_000 })
    expect(response.body.booking).toMatchObject({ totalCents: 12_000, contact: { email: 'marta@example.com', phone: null } })

    const lookup = await request(app).post('/api/bookings/lookup').send({ reference: response.body.booking.reference, email: 'marta@example.com' })
    expect(lookup.status).toBe(200)
  })

  it('can be cancelled by the customer with the phone number it was taken with', async () => {
    const admin = await adminAgent(app)
    const { response } = await phoneBooking(admin, { phone: '+34 600 111 222' })
    const reference = response.body.booking.reference as string

    expect((await request(app).post(`/api/bookings/${reference}/cancel`).send({ phone: '+34 699 000 000' })).status).toBe(404)
    const cancelled = await request(app).post(`/api/bookings/${reference}/cancel`).send({ phone: '600111222' })
    expect(cancelled.body.booking.status).toBe('cancelled')
  })

  it('is not booked twice when the form is sent twice', async () => {
    const admin = await adminAgent(app)
    const { quote, choice } = await operatorQuote(admin)
    const body = { quoteId: quote.id, vehicleId: choice.vehicleId, contact: { name: 'Marta Soler', phone: '+34 600 111 222' } }
    const first = await admin.post('/api/admin/bookings').send(body)
    const second = await admin.post('/api/admin/bookings').send(body)
    expect(first.status).toBe(201)
    expect(second.status).toBe(200)
    expect(second.body.booking.reference).toBe(first.body.booking.reference)
  })
})

describe('a customer who signs up later', () => {
  const signUp = (details: Record<string, unknown>) => {
    const agent = request.agent(app)
    return agent.post('/api/auth/register').send({ name: 'Marta Soler', email: 'marta@example.com', password: 'correct-horse-9', ...details }).then((response) => ({ agent, response }))
  }

  it('finds the bookings taken for their phone number', async () => {
    const admin = await adminAgent(app)
    const first = (await phoneBooking(admin, { phone: '+34 600 111 222' })).response.body.booking.reference as string
    const second = (await phoneBooking(admin, { phone: '600 111 222' })).response.body.booking.reference as string
    await phoneBooking(admin, { name: 'Someone Else', phone: '+34 699 000 000' })

    const { agent, response } = await signUp({ phone: '600111222' })
    expect(response.status).toBe(201)
    expect(response.body.linkedBookings).toBe(2)

    const mine = (await agent.get('/api/bookings')).body.bookings as { reference: string; isGuest: boolean }[]
    expect(mine.map((booking) => booking.reference).sort()).toEqual([first, second].sort())
    expect(mine.every((booking) => !booking.isGuest)).toBe(true)
  })

  it('finds the bookings taken for their email address', async () => {
    const admin = await adminAgent(app)
    const reference = (await phoneBooking(admin, { email: 'marta@example.com' })).response.body.booking.reference as string
    const { agent, response } = await signUp({})
    expect(response.body.linkedBookings).toBe(1)
    expect((await agent.get(`/api/bookings/${reference}`)).status).toBe(200)
  })

  it('gets nothing that was taken for someone else, or that a guest booked on the website', async () => {
    const admin = await adminAgent(app)
    await phoneBooking(admin, { phone: '+34 699 000 000', email: 'other@example.com' })
    // A guest booking made on the website with the same email stays behind its reference.
    await bookRide(app, { booking: { contact: { name: 'Marta Soler', email: 'marta@example.com', phone: '+34 600 111 222' } } })

    const { agent, response } = await signUp({ phone: '+34 600 111 222' })
    expect(response.body.linkedBookings).toBe(0)
    expect((await agent.get('/api/bookings')).body.bookings).toHaveLength(0)
  })

  it('gets nothing while the business has switched this off', async () => {
    const admin = await adminAgent(app)
    const settings = (await admin.get('/api/admin/settings')).body.settings
    expect(settings.linkBookingsOnSignup).toBe(true)
    expect((await admin.put('/api/admin/settings').send({ ...settings, linkBookingsOnSignup: false })).status).toBe(200)
    await phoneBooking(admin, { phone: '+34 600 111 222', email: 'marta@example.com' })

    const { agent, response } = await signUp({ phone: '+34 600 111 222' })
    expect(response.body.linkedBookings).toBe(0)
    expect((await agent.get('/api/bookings')).body.bookings).toHaveLength(0)
  })
})

describe('a customer who already has an account', () => {
  it('sees a booking taken for their email or number in their account at once', async () => {
    const customer = await registerAgent(app, 'client@example.com')
    const admin = await adminAgent(app)

    const match = await admin.get('/api/admin/customers/match').query({ phone: '600 333 444' })
    expect(match.body.account).toMatchObject({ name: 'Carla Ruiz', email: 'client@example.com' })
    expect((await admin.get('/api/admin/customers/match').query({ email: 'nobody@example.com' })).body.account).toBeNull()

    const byPhone = await phoneBooking(admin, { name: 'Carla Ruiz', phone: '+34 600 333 444' })
    expect(byPhone.response.body.account).toMatchObject({ email: 'client@example.com' })
    expect(byPhone.response.body.booking.isGuest).toBe(false)
    const byEmail = await phoneBooking(admin, { name: 'Carla Ruiz', email: 'client@example.com' })
    expect(byEmail.response.body.booking.isGuest).toBe(false)

    expect((await customer.get('/api/bookings')).body.bookings).toHaveLength(2)
  })

  it('does not, when the operator chooses to keep the booking apart', async () => {
    const customer = await registerAgent(app, 'client@example.com')
    const admin = await adminAgent(app)
    const { response } = await phoneBooking(admin, { name: 'Carla Ruiz', email: 'client@example.com' }, { linkAccount: false })
    expect(response.body.account).toBeNull()
    expect(response.body.booking.isGuest).toBe(true)
    expect((await customer.get('/api/bookings')).body.bookings).toHaveLength(0)
  })

  it('is not guessed when two accounts share a phone number', async () => {
    await registerAgent(app, 'one@example.com')
    await registerAgent(app, 'two@example.com')
    const admin = await adminAgent(app)
    expect((await admin.get('/api/admin/customers/match').query({ phone: '+34 600 333 444' })).body.account).toBeNull()
    const { response } = await phoneBooking(admin, { phone: '+34 600 333 444' })
    expect(response.body.booking.isGuest).toBe(true)
  })
})
