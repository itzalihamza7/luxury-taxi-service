import { and, eq } from 'drizzle-orm'
import { Router } from 'express'
import { z } from 'zod'
import type { Config } from '../../config.js'
import type { AppContext } from '../../context.js'
import { db } from '../../db/client.js'
import { bookingPayments, bookings, paymentProofs, vehicles, type Booking, type BookingChange } from '../../db/schema.js'
import { badRequest, conflict, notFound } from '../../lib/errors.js'
import { normalizeReference } from '../../lib/reference.js'
import { zonedDateTimeToUtc } from '../../lib/time.js'
import { email, isUuid, optionalText, parse, personName, phone } from '../../lib/validate.js'
import { bookingUpdatedEmail, paymentRequestedEmail } from '../bookings/emails.js'
import { listEvents, listPayments, paymentStatusFor, paymentWhatsappUrl, recordEvent, sendQuietly, serializeEvent, serializePayment, type Actor } from '../bookings/flow.js'
import { findBookingByReference, serializeBooking } from '../bookings/service.js'

/*
 * What the team does with a booking after it comes in: edit it (always with a note, which the
 * customer sees), ask for a payment through a payment link, and record the money as it arrives.
 */

const place = z.object({ label: z.string().trim().min(1).max(200), lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) })
const nullableEmail = z.preprocess((value) => (value === '' ? null : value), email.nullable())
const nullablePhone = z.preprocess((value) => (value === '' ? null : value), phone.nullable())
const count = (max: number, min = 0) => z.number().int().min(min).max(max)

/** Fields left out stay as they are. Times are in the business's time zone. */
const editSchema = z.object({
  note: z.string().trim().min(3, 'required').max(1000),
  pickupDate: z.string().optional(),
  pickupTime: z.string().optional(),
  returnDate: z.string().nullable().optional(),
  returnTime: z.string().nullable().optional(),
  hours: count(24, 1).nullable().optional(),
  pickup: place.optional(),
  dropoff: place.nullable().optional(),
  vehicleId: z.uuid().optional(),
  totalCents: count(10_000_000).nullable().optional(),
  adults: count(16, 1).optional(),
  children: count(16).optional(),
  luggage: count(16).optional(),
  flightNumber: optionalText(12).optional(),
  contact: z
    .object({
      name: personName,
      email: nullableEmail,
      phone: nullablePhone,
      company: optionalText(120),
      notes: optionalText(1000),
    })
    .optional(),
})

const paymentSchema = z.object({
  kind: z.enum(['advance', 'full', 'balance']),
  amountCents: count(10_000_000, 1),
  /** The payment link made with the business's payment provider (Stripe, PayPal, the bank…). */
  link: z
    .string()
    .trim()
    .max(1000)
    .refine((value) => /^https:\/\/[^\s]+$/.test(value), { message: 'invalid_link' }),
})

export const actorOf = (user: { id: string; name: string } | undefined): Actor => (user ? { id: user.id, name: user.name } : null)

/** A booking as the team sees it: everything the customer sees, the guest code, and the WhatsApp message for each open payment. */
export async function serializeAdminBooking(booking: Booking, config: Config) {
  const [events, payments] = await Promise.all([listEvents(booking.id), listPayments(booking.id)])
  return {
    ...serializeBooking(booking, config),
    guestCode: booking.guestCode,
    proofToCheck: payments.some((payment) => payment.status === 'requested' && payment.proofUploadedAt !== null),
    events: events.map(serializeEvent),
    payments: payments.map((payment) => ({
      ...serializePayment(payment),
      link: payment.link,
      whatsappUrl: payment.status === 'requested' ? paymentWhatsappUrl(booking, payment, config) : null,
      proofUrl: payment.proofUploadedAt ? `/api/admin/bookings/${booking.reference}/payments/${payment.id}/proof` : null,
    })),
  }
}

async function findOrFail(reference: unknown): Promise<Booking> {
  const booking = await findBookingByReference(normalizeReference(String(reference)))
  if (!booking) throw notFound('BOOKING_NOT_FOUND', 'Booking not found.')
  return booking
}

/** Records one changed field, if it did change. */
function track(changes: BookingChange[], field: string, from: string | number | null | undefined, to: string | number | null | undefined) {
  const before = from === undefined || from === null || from === '' ? null : String(from)
  const after = to === undefined || to === null || to === '' ? null : String(to)
  if (before !== after) changes.push({ field, from: before, to: after })
}

export function bookingActionsRouter(context: AppContext): Router {
  const { config, mailer } = context
  const router = Router()

  router.get('/bookings/:reference', async (req, res) => {
    res.json({ booking: await serializeAdminBooking(await findOrFail(req.params.reference), config) })
  })

  /** Edits a booking. The note is required: the customer reads it, with what changed, by email and on the booking's page. */
  router.put('/bookings/:reference', async (req, res) => {
    const input = parse(editSchema, req.body)
    const booking = await findOrFail(req.params.reference)
    if (booking.status === 'cancelled') throw conflict('BOOKING_CANCELLED', 'A cancelled booking cannot be edited.')

    const set: Partial<typeof bookings.$inferInsert> = {}
    const changes: BookingChange[] = []

    if (input.pickupDate !== undefined || input.pickupTime !== undefined) {
      const local = new Intl.DateTimeFormat('sv-SE', { timeZone: config.BUSINESS_TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
        .format(booking.pickupAt)
        .split(' ')
      const pickupAt = zonedDateTimeToUtc(input.pickupDate ?? local[0]!, input.pickupTime ?? local[1]!, config.BUSINESS_TIMEZONE)
      if (!pickupAt) throw badRequest('VALIDATION', 'Please check the highlighted fields.', { pickupDate: 'invalid' })
      if (pickupAt.getTime() !== booking.pickupAt.getTime()) {
        set.pickupAt = pickupAt
        track(changes, 'pickupAt', booking.pickupAt.toISOString(), pickupAt.toISOString())
      }
    }
    if (input.returnDate !== undefined || input.returnTime !== undefined) {
      const returnAt = input.returnDate && input.returnTime ? zonedDateTimeToUtc(input.returnDate, input.returnTime, config.BUSINESS_TIMEZONE) : null
      if (input.returnDate && input.returnTime && !returnAt) throw badRequest('VALIDATION', 'Please check the highlighted fields.', { returnDate: 'invalid' })
      if ((returnAt?.getTime() ?? null) !== (booking.returnAt?.getTime() ?? null)) {
        set.returnAt = returnAt
        track(changes, 'returnAt', booking.returnAt?.toISOString(), returnAt?.toISOString())
      }
    }
    const pickupAt = set.pickupAt ?? booking.pickupAt
    const returnAt = set.returnAt === undefined ? booking.returnAt : set.returnAt
    if (returnAt && returnAt.getTime() <= pickupAt.getTime()) throw badRequest('VALIDATION', 'Please check the highlighted fields.', { returnTime: 'before_pickup' })

    if (input.hours !== undefined && input.hours !== booking.hours) {
      set.hours = input.hours
      track(changes, 'hours', booking.hours, input.hours)
    }
    if (input.pickup && (input.pickup.label !== booking.pickupLabel || input.pickup.lat !== booking.pickupLat || input.pickup.lng !== booking.pickupLng)) {
      Object.assign(set, { pickupLabel: input.pickup.label, pickupLat: input.pickup.lat, pickupLng: input.pickup.lng })
      track(changes, 'pickup', booking.pickupLabel, input.pickup.label)
    }
    if (input.dropoff !== undefined) {
      const same = input.dropoff ? input.dropoff.label === booking.dropoffLabel && input.dropoff.lat === booking.dropoffLat && input.dropoff.lng === booking.dropoffLng : booking.dropoffLabel === null
      if (!same) {
        Object.assign(set, { dropoffLabel: input.dropoff?.label ?? null, dropoffLat: input.dropoff?.lat ?? null, dropoffLng: input.dropoff?.lng ?? null })
        track(changes, 'dropoff', booking.dropoffLabel, input.dropoff?.label)
      }
    }
    if (input.vehicleId && input.vehicleId !== booking.vehicleId) {
      const [vehicle] = await db.select().from(vehicles).where(eq(vehicles.id, input.vehicleId))
      if (!vehicle) throw badRequest('VALIDATION', 'Please check the highlighted fields.', { vehicleId: 'invalid' })
      Object.assign(set, { vehicleId: vehicle.id, vehicleName: vehicle.name })
      track(changes, 'vehicle', booking.vehicleName, vehicle.name)
    }
    if (input.totalCents !== undefined && input.totalCents !== booking.totalCents) {
      set.totalCents = input.totalCents
      track(changes, 'totalCents', booking.totalCents, input.totalCents)
    }
    for (const field of ['adults', 'children', 'luggage'] as const) {
      const value = input[field]
      if (value !== undefined && value !== booking[field]) {
        set[field] = value
        track(changes, field, booking[field], value)
      }
    }
    if ((input.adults ?? booking.adults) + (input.children ?? booking.children) > 16) throw badRequest('VALIDATION', 'Please check the highlighted fields.', { adults: 'too_many_passengers' })
    if (input.flightNumber !== undefined && (input.flightNumber ?? null) !== booking.flightNumber) {
      set.flightNumber = input.flightNumber ?? null
      track(changes, 'flightNumber', booking.flightNumber, input.flightNumber)
    }
    if (input.contact) {
      const contact = { contactName: input.contact.name, contactEmail: input.contact.email, contactPhone: input.contact.phone, company: input.contact.company ?? null, notes: input.contact.notes ?? null }
      if (!contact.contactEmail && !contact.contactPhone) throw badRequest('VALIDATION', 'Please check the highlighted fields.', { email: 'required' })
      for (const [field, value] of Object.entries(contact) as [keyof typeof contact, string | null][]) {
        if ((value ?? null) !== booking[field]) {
          // The name is always given (personName), so only the nullable fields can become null.
          ;(set as Record<string, string | null>)[field] = value
          track(changes, field, booking[field], value)
        }
      }
    }

    if (changes.length === 0) throw badRequest('NOTHING_CHANGED', 'Nothing was changed.')
    const [updated] = await db
      .update(bookings)
      .set({ ...set, updatedAt: new Date() })
      .where(eq(bookings.id, booking.id))
      .returning()
    if (!updated) throw notFound('BOOKING_NOT_FOUND', 'Booking not found.')
    await recordEvent(booking.id, 'edited', actorOf(req.user), changes, input.note)
    sendQuietly(mailer, bookingUpdatedEmail(updated, changes, input.note, config))
    res.json({ booking: await serializeAdminBooking(updated, config) })
  })

  /** Asks the customer to pay, by email now and by WhatsApp with one tap from the console. */
  router.post('/bookings/:reference/payments', async (req, res) => {
    const input = parse(paymentSchema, req.body)
    const booking = await findOrFail(req.params.reference)
    if (booking.status === 'cancelled' || booking.status === 'completed') throw conflict('BOOKING_CLOSED', `A ${booking.status} booking cannot take a payment.`)
    if (booking.totalCents === null) throw conflict('PRICE_NOT_SET', 'Set the price of the booking first (Edit).')
    if (input.amountCents > booking.totalCents) throw badRequest('VALIDATION', 'Please check the highlighted fields.', { amountCents: 'above_total' })

    const [payment] = await db
      .insert(bookingPayments)
      .values({ bookingId: booking.id, kind: input.kind, amountCents: input.amountCents, currency: booking.currency, link: input.link, requestedBy: req.user!.id })
      .returning()
    if (!payment) throw new Error('payment insert returned no row')
    await recordEvent(booking.id, 'payment_requested', actorOf(req.user), [
      { field: 'paymentKind', from: null, to: payment.kind },
      { field: 'paymentAmountCents', from: null, to: String(payment.amountCents) },
    ])
    // What is left once this payment is in: an advance always tells the customer the rest.
    const received = (await listPayments(booking.id)).filter((item) => item.status === 'paid').reduce((sum, item) => sum + item.amountCents, 0)
    sendQuietly(mailer, paymentRequestedEmail(booking, payment, Math.max(0, booking.totalCents - received - payment.amountCents), config))
    res.status(201).json({ booking: await serializeAdminBooking(booking, config), whatsappUrl: paymentWhatsappUrl(booking, payment, config) })
  })

  /** The customer's proof of a payment (a screenshot or PDF), to check before marking it received. */
  router.get('/bookings/:reference/payments/:id/proof', async (req, res) => {
    const booking = await findOrFail(req.params.reference)
    const id = String(req.params.id)
    const [proof] = isUuid(id)
      ? await db
          .select({ contentType: paymentProofs.contentType, data: paymentProofs.data })
          .from(paymentProofs)
          .innerJoin(bookingPayments, eq(bookingPayments.id, paymentProofs.paymentId))
          .where(and(eq(paymentProofs.paymentId, id), eq(bookingPayments.bookingId, booking.id)))
      : []
    if (!proof) throw notFound('PROOF_NOT_FOUND', 'No proof has been uploaded for this payment.')
    // The type was checked from the file's bytes on upload; the browser must not guess another.
    res.set({ 'Content-Type': proof.contentType, 'Content-Disposition': 'inline', 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' })
    res.send(proof.data)
  })

  /** The money has arrived (or the request is withdrawn). The booking's payment status follows. */
  router.post('/bookings/:reference/payments/:id/:action', async (req, res) => {
    const action = req.params.action
    if (action !== 'paid' && action !== 'cancel') throw notFound()
    const booking = await findOrFail(req.params.reference)
    const [payment] = isUuid(req.params.id)
      ? await db.select().from(bookingPayments).where(and(eq(bookingPayments.id, req.params.id), eq(bookingPayments.bookingId, booking.id)))
      : []
    if (!payment) throw notFound('PAYMENT_NOT_FOUND', 'Payment request not found.')
    if (payment.status !== 'requested') throw conflict('PAYMENT_CLOSED', `This payment is already ${payment.status}.`)

    const now = new Date()
    await db
      .update(bookingPayments)
      .set(action === 'paid' ? { status: 'paid', paidAt: now } : { status: 'cancelled' })
      .where(eq(bookingPayments.id, payment.id))
    const status = paymentStatusFor(booking, await listPayments(booking.id))
    const [updated] = await db
      .update(bookings)
      .set({ paymentStatus: status, paidAt: status === 'paid' ? (booking.paidAt ?? now) : null, updatedAt: now })
      .where(eq(bookings.id, booking.id))
      .returning()
    await recordEvent(booking.id, action === 'paid' ? 'payment_received' : 'payment_cancelled', actorOf(req.user), [
      { field: 'paymentKind', from: null, to: payment.kind },
      { field: 'paymentAmountCents', from: null, to: String(payment.amountCents) },
    ])
    res.json({ booking: await serializeAdminBooking(updated ?? booking, config) })
  })

  return router
}

