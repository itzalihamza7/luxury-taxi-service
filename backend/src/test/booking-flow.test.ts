import { eq } from 'drizzle-orm'
import request from 'supertest'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../db/client.js'
import { bookings } from '../db/schema.js'
import type { Email } from '../lib/mailer.js'
import { adminAgent, bookRide, buildApp, CONTACT, localDateTime, memoryMailer, registerAgent, requestQuote, resetDatabase } from './helpers.js'

beforeEach(resetDatabase)

/** Booking emails go out in the background: wait for the one wanted. */
async function emailWith(sent: Email[], subject: string): Promise<Email> {
  for (let i = 0; i < 100; i += 1) {
    const found = sent.find((email) => email.subject === subject)
    if (found) return found
    await new Promise((resolve) => setTimeout(resolve, 20))
  }
  throw new Error(`no email "${subject}" in: ${sent.map((email) => email.subject).join(' | ')}`)
}

const guestCodeOf = async (reference: string) => (await db.select({ code: bookings.guestCode }).from(bookings).where(eq(bookings.reference, reference)))[0]?.code ?? ''

function setUp() {
  const { sent, mailer } = memoryMailer()
  const app = buildApp({ APP_URL: 'https://signaturemile.example' }, { mailer })
  return { sent, app }
}

describe('a guest booking', () => {
  it('emails the booking with its guest code; only that code opens the booking page', async () => {
    const { sent, app } = setUp()
    const { response } = await bookRide(app)
    const reference = response.body.booking.reference as string
    const code = await guestCodeOf(reference)
    expect(code).toMatch(/^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/)

    const email = await emailWith(sent, `Booking received: ${reference}`)
    expect(email.to).toBe(CONTACT.email)
    expect(email.text).toContain(code)
    expect(email.text).toContain(`https://signaturemile.example/en/booking/${reference}`)
    expect(email.text).toContain('secure payment link')
    // The code reaches the customer by email only, never in the website's answer.
    expect(JSON.stringify(response.body)).not.toContain(code)

    expect((await request(app).post(`/api/bookings/${reference}/open`).send({ code: 'ABCD-EFGH' })).status).toBe(404)
    // Typed as people do: lower case, without the dash.
    const opened = await request(app).post(`/api/bookings/${reference}/open`).send({ code: code.toLowerCase().replace('-', '') })
    expect(opened.status).toBe(200)
    expect(opened.body.booking).toMatchObject({ reference, status: 'pending', payments: [] })
    expect(opened.body.booking.events).toMatchObject([{ kind: 'created', actorName: null }])
  })

  it('lets a guest cancel with the code, and confirms it by email', async () => {
    const { sent, app } = setUp()
    const reference = (await bookRide(app)).response.body.booking.reference as string
    const code = await guestCodeOf(reference)

    expect((await request(app).post(`/api/bookings/${reference}/cancel`).send({ code: 'WRON-GCOD' })).status).toBe(404)
    const cancelled = await request(app).post(`/api/bookings/${reference}/cancel`).send({ code })
    expect(cancelled.body.booking.status).toBe('cancelled')
    expect(cancelled.body.booking.events[0]).toMatchObject({ kind: 'status_changed', changes: [{ field: 'status', from: 'pending', to: 'cancelled' }] })
    await emailWith(sent, `Booking cancelled: ${reference}`)
  })
})

describe('the team takes a booking from received to confirmed', () => {
  it('edits it with a note, asks for an advance, records it, confirms it, and the customer sees every step', async () => {
    const { sent, app } = setUp()
    const admin = await adminAgent(app)
    const booked = (await bookRide(app)).response.body.booking
    const reference = booked.reference as string
    const quoted = booked.totalCents as number
    const code = await guestCodeOf(reference)

    // Every edit needs a note, and must change something.
    expect((await admin.put(`/api/admin/bookings/${reference}`).send({ totalCents: 9500 })).body.error.fields).toMatchObject({ note: 'required' })
    expect((await admin.put(`/api/admin/bookings/${reference}`).send({ note: 'Nothing new', totalCents: quoted })).body.error.code).toBe('NOTHING_CHANGED')

    const edited = await admin.put(`/api/admin/bookings/${reference}`).send({ note: 'Your flight lands later, so we moved the pickup.', pickupTime: '12:30', totalCents: 9500 })
    expect(edited.status).toBe(200)
    expect(edited.body.booking.totalCents).toBe(9500)
    expect(edited.body.booking.events[0]).toMatchObject({
      kind: 'edited',
      actorName: 'Operations',
      note: 'Your flight lands later, so we moved the pickup.',
      changes: [
        { field: 'pickupAt', from: expect.any(String), to: expect.any(String) },
        { field: 'totalCents', from: String(quoted), to: '9500' },
      ],
    })
    const updated = await emailWith(sent, `Your booking ${reference} was updated`)
    expect(updated.text).toContain('Note from our team: Your flight lands later, so we moved the pickup.')
    // The website quoted just under the round fare (€89.x0); the team set a round price.
    expect(updated.text).toMatch(/Price: €89\.\d0 → €95/)
    expect(updated.text).toContain('12:30')

    // An advance, through the business's own payment link: the email points to the booking's page, WhatsApp carries the link.
    expect((await admin.post(`/api/admin/bookings/${reference}/payments`).send({ kind: 'advance', amountCents: 3000, link: 'http://pay.example.com/x' })).status).toBe(400)
    expect((await admin.post(`/api/admin/bookings/${reference}/payments`).send({ kind: 'full', amountCents: 20_000, link: 'https://pay.example.com/x' })).body.error.fields).toMatchObject({ amountCents: 'above_total' })
    const asked = await admin.post(`/api/admin/bookings/${reference}/payments`).send({ kind: 'advance', amountCents: 3000, link: 'https://pay.example.com/abc' })
    expect(asked.status).toBe(201)
    const whatsapp = decodeURIComponent(asked.body.whatsappUrl as string)
    expect(asked.body.whatsappUrl).toMatch(/^https:\/\/wa\.me\/34600111222\?text=/)
    expect(whatsapp).toContain('https://pay.example.com/abc')
    expect(whatsapp).toContain(`https://signaturemile.example/en/booking/${reference}`)
    expect(whatsapp).toContain(code)
    const paymentEmail = await emailWith(sent, `Payment to confirm your booking ${reference}`)
    expect(paymentEmail.text).toContain('advance of €30')
    // The rest of the €95 is spelled out; the link itself is only on the booking's page.
    expect(paymentEmail.text).toContain('After this payment, €65 remains to be paid.')
    expect(paymentEmail.text).toContain('Payment done')
    expect(paymentEmail.text).not.toContain('https://pay.example.com/abc')
    expect(paymentEmail.text).toContain(`https://signaturemile.example/en/booking/${reference}`)
    expect(paymentEmail.text).toContain(code)
    // Every email opens with the logo from the website, linking home.
    expect(paymentEmail.html).toContain('<a href="https://signaturemile.example" style="display:inline-block;margin:0 0 24px;text-decoration:none"><img src="https://signaturemile.example/images/logo.png"')
    expect(paymentEmail.html).toContain('alt="SignatureMile · Private chauffeurs"')

    // The customer finds the link on the booking's page.
    const page = await request(app).post(`/api/bookings/${reference}/open`).send({ code })
    expect(page.body.booking.payments).toMatchObject([{ kind: 'advance', amountCents: 3000, status: 'requested', link: 'https://pay.example.com/abc' }])

    // The money arrives: an advance leaves the booking partly paid.
    const paymentId = asked.body.booking.payments[0].id as string
    const paid = await admin.post(`/api/admin/bookings/${reference}/payments/${paymentId}/paid`)
    expect(paid.body.booking).toMatchObject({ paymentStatus: 'partly_paid' })
    expect(paid.body.booking.payments[0]).toMatchObject({ status: 'paid', whatsappUrl: null })
    expect((await admin.post(`/api/admin/bookings/${reference}/payments/${paymentId}/paid`)).status).toBe(409)

    // Then the team confirms it, and the customer hears.
    expect((await admin.patch(`/api/admin/bookings/${reference}`).send({ status: 'confirmed' })).body.booking.status).toBe('confirmed')
    await emailWith(sent, `Booking confirmed: ${reference}`)

    // The customer's page shows the whole history, newest first; a paid link is no longer shown.
    const history = (await request(app).post(`/api/bookings/${reference}/open`).send({ code })).body.booking
    expect(history.events.map((event: { kind: string }) => event.kind)).toEqual(['status_changed', 'payment_received', 'payment_requested', 'edited', 'created'])
    expect(history.payments[0].link).toBeNull()
  })

  it('settles the booking with the rest, and lets the team withdraw a link', async () => {
    const { sent, app } = setUp()
    const admin = await adminAgent(app)
    const booked = (await bookRide(app)).response.body.booking
    const reference = booked.reference as string
    const total = booked.totalCents as number
    const ask = (body: Record<string, unknown>) => admin.post(`/api/admin/bookings/${reference}/payments`).send({ link: 'https://pay.example.com/abc', ...body })

    const wrong = (await ask({ kind: 'full', amountCents: total })).body.booking.payments[0].id as string
    const withdrawn = await admin.post(`/api/admin/bookings/${reference}/payments/${wrong}/cancel`)
    expect(withdrawn.body.booking.payments[0]).toMatchObject({ status: 'cancelled' })
    expect(withdrawn.body.booking.paymentStatus).toBe('unpaid')

    const advance = (await ask({ kind: 'advance', amountCents: 4000 })).body.booking.payments[1].id as string
    await admin.post(`/api/admin/bookings/${reference}/payments/${advance}/paid`)
    const balance = (await ask({ kind: 'balance', amountCents: total - 4000 })).body.booking.payments[2].id as string
    // The balance settles everything asked for: its email (the third payment email) names nothing left to pay.
    const paymentEmails = () => sent.filter((email) => email.subject === `Payment to confirm your booking ${reference}`)
    for (let i = 0; i < 100 && paymentEmails().length < 3; i += 1) await new Promise((resolve) => setTimeout(resolve, 20))
    expect(paymentEmails()).toHaveLength(3)
    expect(paymentEmails()[2]?.text).toContain(`remaining balance of €${((total - 4000) / 100).toFixed(2)}`)
    expect(paymentEmails()[2]?.text).not.toContain('remains to be paid')
    expect((await admin.post(`/api/admin/bookings/${reference}/payments/${balance}/paid`)).body.booking.paymentStatus).toBe('paid')
  })

  it('needs a note to cancel, and tells the customer why', async () => {
    const { sent, app } = setUp()
    const admin = await adminAgent(app)
    const reference = (await bookRide(app)).response.body.booking.reference as string

    expect((await admin.patch(`/api/admin/bookings/${reference}`).send({ status: 'cancelled' })).body.error.fields).toMatchObject({ note: 'required' })
    const cancelled = await admin.patch(`/api/admin/bookings/${reference}`).send({ status: 'cancelled', note: 'No vehicle free at that time, sorry.' })
    expect(cancelled.body.booking.status).toBe('cancelled')
    const email = await emailWith(sent, `Booking cancelled: ${reference}`)
    expect(email.text).toContain('No vehicle free at that time, sorry.')
    expect((await admin.put(`/api/admin/bookings/${reference}`).send({ note: 'Too late', totalCents: 1 })).body.error.code).toBe('BOOKING_CANCELLED')
  })

  it('keeps the console to the team: customers cannot edit a booking', async () => {
    const { app } = setUp()
    const reference = (await bookRide(app)).response.body.booking.reference as string
    const customer = await registerAgent(app)
    expect((await request(app).put(`/api/admin/bookings/${reference}`).send({ note: 'Mine now', totalCents: 1 })).status).toBe(401)
    expect((await customer.put(`/api/admin/bookings/${reference}`).send({ note: 'Mine now', totalCents: 1 })).status).toBe(403)
  })
})

describe('a ride priced on request', () => {
  it('can be booked without a price; the team sets it before asking for payment', async () => {
    const { sent, app } = setUp()
    const admin = await adminAgent(app)
    const quote = await requestQuote(app, { rideType: 'hourly', dropoff: null, hours: 3 })
    const sprinter = quote.options.find((option) => option.vehicle.slug === 'mercedes-sprinter')!
    expect(sprinter).toMatchObject({ totalCents: null, available: true })

    const booked = await request(app)
      .post('/api/bookings')
      .send({ quoteId: quote.id, vehicleId: sprinter.vehicleId, contact: CONTACT, paymentMethod: 'chauffeur', acceptTerms: true, locale: 'es' })
    expect(booked.status).toBe(201)
    const reference = booked.body.booking.reference as string
    expect(booked.body.booking.totalCents).toBeNull()
    const email = await emailWith(sent, `Reserva recibida: ${reference}`)
    expect(email.text).toContain('Por confirmar')
    expect(email.text).toContain('le contactaremos para confirmarlo')

    // Online payment needs a price.
    const online = await request(app)
      .post('/api/bookings')
      .send({ quoteId: (await requestQuote(app, { rideType: 'hourly', dropoff: null, hours: 3 })).id, vehicleId: sprinter.vehicleId, contact: CONTACT, paymentMethod: 'online', acceptTerms: true })
    expect(online.status).toBe(400)

    expect((await admin.post(`/api/admin/bookings/${reference}/payments`).send({ kind: 'full', amountCents: 50_000, link: 'https://pay.example.com/s' })).body.error.code).toBe('PRICE_NOT_SET')
    await admin.put(`/api/admin/bookings/${reference}`).send({ note: 'Precio acordado por teléfono.', totalCents: 54_000 })
    const updated = await emailWith(sent, `Se ha actualizado su reserva ${reference}`)
    expect(updated.text).toMatch(/Precio: Por confirmar → 540\s?€/)
    expect((await admin.post(`/api/admin/bookings/${reference}/payments`).send({ kind: 'full', amountCents: 54_000, link: 'https://pay.example.com/s' })).status).toBe(201)
  })
})

describe('the customer proves a payment with "Payment done"', () => {
  /** A file that starts like a PNG: the server judges the type by the first bytes. */
  const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(64, 1)])
  const PDF = Buffer.from('%PDF-1.7\n% payment confirmation\n')

  async function bookingWithRequest() {
    const { app } = setUp()
    const admin = await adminAgent(app)
    const reference = (await bookRide(app)).response.body.booking.reference as string
    const code = await guestCodeOf(reference)
    const asked = await admin.post(`/api/admin/bookings/${reference}/payments`).send({ kind: 'advance', amountCents: 3000, link: 'https://pay.example.com/abc' })
    const paymentId = asked.body.booking.payments[0].id as string
    const upload = (file: Buffer, type: string, guestCode: string | null = code) => {
      const call = request(app).post(`/api/bookings/${reference}/payments/${paymentId}/proof`).set('Content-Type', type)
      return (guestCode ? call.set('X-Guest-Code', guestCode) : call).send(file)
    }
    return { app, admin, reference, code, paymentId, upload }
  }

  it('takes a screenshot with the guest code, keeps the payment open, and shows the proof to the team only', async () => {
    const { app, admin, reference, paymentId, upload } = await bookingWithRequest()

    expect((await upload(PNG, 'image/png', null)).status).toBe(404)
    expect((await upload(PNG, 'image/png', 'WRON-GCOD')).status).toBe(404)
    expect((await upload(Buffer.from('not a picture'), 'image/png')).body.error.code).toBe('UNSUPPORTED_PROOF')
    expect((await upload(Buffer.from('plain text'), 'text/plain')).body.error.code).toBe('UNSUPPORTED_PROOF')
    expect((await upload(Buffer.alloc(9 * 1024 * 1024, 1), 'image/png')).status).toBe(413)

    const done = await upload(PNG, 'image/png')
    expect(done.status).toBe(200)
    // Still requested: the team checks the proof before marking it received.
    expect(done.body.booking.payments[0]).toMatchObject({ id: paymentId, status: 'requested', proofUploadedAt: expect.any(String) })
    expect(done.body.booking.paymentStatus).toBe('unpaid')
    expect(done.body.booking.events[0]).toMatchObject({ kind: 'payment_proof', actorName: null })

    // The team sees it in the list and on the booking, and can open the file.
    const list = await admin.get('/api/admin/bookings')
    expect(list.body.bookings.find((booking: { reference: string }) => booking.reference === reference)).toMatchObject({ proofToCheck: true })
    const console = (await admin.get(`/api/admin/bookings/${reference}`)).body.booking
    expect(console.proofToCheck).toBe(true)
    expect(console.payments[0].proofUrl).toBe(`/api/admin/bookings/${reference}/payments/${paymentId}/proof`)
    const file = await admin.get(console.payments[0].proofUrl).buffer(true)
    expect(file.status).toBe(200)
    expect(file.headers['content-type']).toBe('image/png')
    expect(Buffer.compare(file.body as Buffer, PNG)).toBe(0)
    // Nobody else can.
    expect((await request(app).get(console.payments[0].proofUrl)).status).toBe(401)
    expect((await (await registerAgent(app, 'someone@example.com')).get(console.payments[0].proofUrl)).status).toBe(403)

    // A PDF replaces the screenshot.
    expect((await upload(PDF, 'application/pdf')).status).toBe(200)
    expect((await admin.get(console.payments[0].proofUrl)).headers['content-type']).toBe('application/pdf')

    // Once marked received there is nothing left to prove.
    const paid = await admin.post(`/api/admin/bookings/${reference}/payments/${paymentId}/paid`)
    expect(paid.body.booking).toMatchObject({ paymentStatus: 'partly_paid', proofToCheck: false })
    expect((await upload(PNG, 'image/png')).body.error.code).toBe('PAYMENT_CLOSED')
  })

  it('lets a customer with an account upload with their session, but not someone else', async () => {
    const { app } = setUp()
    const admin = await adminAgent(app)
    const owner = await registerAgent(app, 'owner@example.com')
    const reference = (await bookRide(app, { agent: owner, booking: { contact: { ...CONTACT, email: 'owner@example.com' } } })).response.body.booking.reference as string
    const asked = await admin.post(`/api/admin/bookings/${reference}/payments`).send({ kind: 'full', amountCents: 3000, link: 'https://pay.example.com/abc' })
    const url = `/api/bookings/${reference}/payments/${asked.body.booking.payments[0].id}/proof`

    expect((await (await registerAgent(app, 'other@example.com')).post(url).set('Content-Type', 'image/png').send(PNG)).status).toBe(404)
    expect((await owner.post(url).set('Content-Type', 'image/png').send(PNG)).status).toBe(200)
  })

  it('takes the proof from the team too, who open any booking page while signed in', async () => {
    const { admin, reference, paymentId } = await bookingWithRequest()
    const done = await admin.post(`/api/bookings/${reference}/payments/${paymentId}/proof`).set('Content-Type', 'image/png').send(PNG)
    expect(done.status).toBe(200)
    expect(done.body.booking.payments[0]).toMatchObject({ id: paymentId, status: 'requested', proofUploadedAt: expect.any(String) })
    expect(done.body.booking.events[0]).toMatchObject({ kind: 'payment_proof', actorName: expect.any(String) })
  })
})

describe('accounts and guest bookings', () => {
  const codeIn = (email: Email) => email.subject.match(/(\d{6})$/)?.[1] ?? ''

  it('adds the bookings made with the same email once the customer proves the address is theirs', async () => {
    const { sent, app } = setUp()
    const reference = (await bookRide(app, { booking: { contact: { ...CONTACT, email: 'client@example.com' } } })).response.body.booking.reference as string
    const guestCode = await guestCodeOf(reference)

    const customer = await registerAgent(app, 'client@example.com')
    // Not before: anyone could sign up with someone else's email.
    expect((await customer.get('/api/bookings')).body.bookings).toEqual([])
    expect((await customer.get('/api/auth/me')).body.user.emailVerified).toBe(false)

    // The code was sent at sign-up.
    const codeEmail = sent.find((email) => email.subject.startsWith('Your SignatureMile code'))!
    expect(codeEmail.to).toBe('client@example.com')
    expect(codeEmail.html).toContain('<img src="https://signaturemile.example/images/logo.png"')
    const wrong = codeIn(codeEmail) === '000000' ? '111111' : '000000'
    expect((await customer.post('/api/auth/email/verify').send({ code: wrong })).body.error.code).toBe('CODE_INVALID')
    const verified = await customer.post('/api/auth/email/verify').send({ code: codeIn(codeEmail) })
    expect(verified.body).toMatchObject({ linkedBookings: 1, user: { emailVerified: true } })
    expect((await customer.get('/api/bookings')).body.bookings.map((booking: { reference: string }) => booking.reference)).toEqual([reference])

    // From now on it opens with the account: the guest code says so.
    expect((await request(app).post(`/api/bookings/${reference}/open`).send({ code: guestCode })).body.error.code).toBe('LOGIN_REQUIRED')
    expect((await customer.get(`/api/bookings/${reference}`)).body.booking.events[0].kind).toBe('created')

    // A later guest booking with the same email joins at the next visit.
    const later = (await bookRide(app, { booking: { contact: { ...CONTACT, email: 'client@example.com' } } })).response.body.booking.reference as string
    expect((await customer.get('/api/bookings')).body.bookings.map((booking: { reference: string }) => booking.reference)).toContain(later)
  })

  it('adds a booking made with another email with its guest code', async () => {
    const { app } = setUp()
    const reference = (await bookRide(app, { booking: { contact: { ...CONTACT, email: 'other@example.com', phone: '+34 600 333 444' } } })).response.body.booking.reference as string
    const customer = await registerAgent(app, 'client@example.com')

    expect((await customer.post('/api/bookings/claim').send({ reference, code: 'ABCD-EFGH' })).status).toBe(404)
    const claimed = await customer.post('/api/bookings/claim').send({ reference, code: await guestCodeOf(reference) })
    expect(claimed.status).toBe(200)
    expect((await customer.get('/api/bookings')).body.bookings).toHaveLength(1)
    // Someone else cannot take it with the same code afterwards.
    const other = await registerAgent(app, 'someone@example.com')
    expect((await other.post('/api/bookings/claim').send({ reference, code: await guestCodeOf(reference) })).status).toBe(404)
  })

  it('sends a fresh code on request, and a used or wrong code stops working', async () => {
    const { sent, app } = setUp()
    const customer = await registerAgent(app, 'client@example.com')
    expect((await customer.post('/api/auth/email/send-code').send({ locale: 'es' })).body.sent).toBe(true)
    const spanish = sent.filter((email) => email.subject.startsWith('Su código de SignatureMile'))
    expect(spanish).toHaveLength(1)
    // The first code was replaced by the new one.
    const first = sent.find((email) => email.subject.startsWith('Your SignatureMile code'))!
    expect((await customer.post('/api/auth/email/verify').send({ code: codeIn(first) })).status).toBe(400)
    expect((await customer.post('/api/auth/email/verify').send({ code: codeIn(spanish[0]!) })).body.user.emailVerified).toBe(true)
    expect((await customer.post('/api/auth/email/send-code').send({})).body.sent).toBe(false)
  })
})

describe('bookings the team enters', () => {
  it('are confirmed at once, say who entered them, and email the customer', async () => {
    const { sent, app } = setUp()
    const admin = await adminAgent(app)
    const when = localDateTime(3)
    const quote = (await admin.post('/api/admin/quotes').send({ rideType: 'airport', pickup: { label: 'T4', lat: 40.4917, lng: -3.5931 }, dropoff: { label: 'Sol', lat: 40.4169, lng: -3.7035 }, pickupDate: when.date, pickupTime: when.time, adults: 2 })).body.quote
    const booked = await admin.post('/api/admin/bookings').send({ quoteId: quote.id, vehicleId: quote.options[0].vehicleId, contact: CONTACT, locale: 'en' })
    expect(booked.status).toBe(201)
    const reference = booked.body.booking.reference as string
    await emailWith(sent, `Booking confirmed: ${reference}`)
    expect((await admin.get(`/api/admin/bookings/${reference}`)).body.booking.events).toMatchObject([{ kind: 'created', actorName: 'Operations' }])
  })
})
