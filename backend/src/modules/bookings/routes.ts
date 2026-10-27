import express, { Router } from 'express'
import { z } from 'zod'
import type { AppContext } from '../../context.js'
import { and, eq, isNull } from 'drizzle-orm'
import { db } from '../../db/client.js'
import { bookingPayments, bookings, paymentProofs } from '../../db/schema.js'
import { badRequest, conflict, forbidden, HttpError, notFound } from '../../lib/errors.js'
import { normalizeReference } from '../../lib/reference.js'
import { blankAsMissing, email, isUuid, locale, optionalText, parse, personName, phone } from '../../lib/validate.js'
import { isStaff, requireUser } from '../auth/session.js'
import { sniffImageType } from '../media/routes.js'
import {
  cancelBooking,
  canCancel,
  contactMatches,
  createBooking,
  findBookingByReference,
  listBookingsForUser,
  serializeBooking,
  serializeBookingInFull,
} from './service.js'
import { claimBookingsByVerifiedEmail, guestCodeMatches, recordEvent } from './flow.js'

const createSchema = z.object({
  quoteId: z.uuid(),
  vehicleId: z.uuid(),
  contact: z.object({
    name: personName,
    email,
    phone,
    company: optionalText(120),
    notes: optionalText(1000),
  }),
  flightNumber: optionalText(12),
  paymentMethod: z.enum(['chauffeur', 'online']),
  acceptTerms: z.literal(true),
  locale,
})

/** A guest names the booking and proves it is theirs with the email or the phone number it was made with. */
const lookupSchema = z
  .object({
    reference: z.string().trim().min(4).max(20),
    email: blankAsMissing(email),
    phone: blankAsMissing(phone),
  })
  .refine((value) => value.email !== undefined || value.phone !== undefined, { message: 'required', path: ['email'] })

const cancelSchema = z.object({
  /** One of these is required for guests; signed-in owners are identified by their session. */
  code: z.string().trim().max(20).optional(),
  email: blankAsMissing(email),
  phone: blankAsMissing(phone),
})

/** The guest code from the booking emails. */
const codeSchema = z.object({ code: z.string().trim().min(4).max(20) })
const claimSchema = z.object({ reference: z.string().trim().min(4).max(20), code: z.string().trim().min(4).max(20) })

const bookingNotFound = () =>
  notFound('BOOKING_NOT_FOUND', 'We could not find a booking with that reference and email or phone number.')

/** Proof of payment: a screenshot or a PDF of the confirmation. */
const PROOF_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
const PROOF_MAX_BYTES = 8 * 1024 * 1024

/** The proof's type, judged by the file's first bytes rather than by what the sender claims. */
export function sniffProofType(bytes: Buffer): string | null {
  return sniffImageType(bytes) ?? (bytes.length >= 5 && bytes.toString('latin1', 0, 5) === '%PDF-' ? 'application/pdf' : null)
}

export function bookingsRouter(context: AppContext): Router {
  const { config, rateLimit } = context
  const router = Router()

  /** Create a booking from a quote. Works for guests and signed-in customers alike. */
  router.post('/', rateLimit({ name: 'bookings', windowMs: 60_000, limit: 10 }), async (req, res) => {
    const input = parse(createSchema, req.body)
    const { booking, approveUrl, created } = await createBooking(context, input, req.user, undefined, Boolean(req.phoneAgent))
    res.status(created ? 201 : 200).json({
      booking: serializeBooking(booking, config),
      /** Present when the customer chose to pay online: redirect them here. */
      payment: approveUrl ? { approveUrl } : null,
    })
  })

  /** The signed-in customer's bookings, newest pickup first, with any made as a guest with their verified email. */
  router.get('/', requireUser, async (req, res) => {
    await claimBookingsByVerifiedEmail(req.user!)
    const rows = await listBookingsForUser(req.user!.id)
    res.json({ bookings: rows.map((row) => serializeBooking(row, config)) })
  })

  /**
   * Guest tracking: the reference alone is not enough, the booking's email or
   * phone number must match too. Both failures look identical so references
   * cannot be probed.
   */
  router.post('/lookup', rateLimit({ name: 'lookup', windowMs: 60_000, limit: 10 }), async (req, res) => {
    const input = parse(lookupSchema, req.body)
    const booking = await findBookingByReference(normalizeReference(input.reference))
    if (!booking || !contactMatches(booking, input)) throw bookingNotFound()
    res.json({ booking: serializeBooking(booking, config) })
  })

  /**
   * A guest opens the booking's page with its reference and guest code. A booking that belongs to
   * an account opens with that account only: the right code then says so, a wrong one says nothing.
   */
  router.post('/:reference/open', rateLimit({ name: 'open', windowMs: 60_000, limit: 10 }), async (req, res) => {
    const { code } = parse(codeSchema, req.body)
    const booking = await findBookingByReference(normalizeReference(String(req.params.reference)))
    if (!booking || !guestCodeMatches(booking, code)) throw notFound('BOOKING_NOT_FOUND', 'We could not find a booking with that reference and guest code.')
    if (booking.userId !== null) throw new HttpError(409, 'LOGIN_REQUIRED', 'This booking is in a customer account. Please log in to see it.')
    res.json({ booking: await serializeBookingInFull(booking, config) })
  })

  /** A signed-in customer adds a booking made as a guest (e.g. with another email) with its guest code. */
  router.post('/claim', requireUser, rateLimit({ name: 'claim', windowMs: 60_000, limit: 10 }), async (req, res) => {
    const input = parse(claimSchema, req.body)
    const booking = await findBookingByReference(normalizeReference(input.reference))
    if (!booking || !guestCodeMatches(booking, input.code) || (booking.userId !== null && booking.userId !== req.user!.id)) {
      throw notFound('BOOKING_NOT_FOUND', 'We could not find a booking with that reference and guest code.')
    }
    const [claimed] = await db
      .update(bookings)
      .set({ userId: req.user!.id, updatedAt: new Date() })
      .where(and(eq(bookings.id, booking.id), isNull(bookings.userId)))
      .returning()
    res.json({ booking: await serializeBookingInFull(claimed ?? booking, config) })
  })

  router.get('/:reference', requireUser, async (req, res) => {
    const booking = await findBookingByReference(normalizeReference(String(req.params.reference)))
    if (!booking) throw bookingNotFound()
    if (booking.userId !== req.user!.id && !isStaff(req.user)) throw forbidden()
    res.json({ booking: await serializeBookingInFull(booking, config) })
  })

  router.post('/:reference/cancel', rateLimit({ name: 'cancel', windowMs: 60_000, limit: 10 }), async (req, res) => {
    const input = parse(cancelSchema, req.body ?? {})
    const booking = await findBookingByReference(normalizeReference(String(req.params.reference)))

    const isOwner = Boolean(booking && req.user && booking.userId === req.user.id)
    const byGuest = Boolean(booking && booking.userId === null && guestCodeMatches(booking, input.code))
    if (!booking || !(isOwner || byGuest || contactMatches(booking, input))) throw bookingNotFound()

    if (booking.status === 'cancelled') {
      res.json({ booking: await serializeBookingInFull(booking, config) })
      return
    }
    if (!canCancel(booking, config)) {
      throw conflict(
        'CANCEL_WINDOW_PASSED',
        `Online cancellation closes ${config.FREE_CANCEL_HOURS} hours before pickup. Please contact us.`,
      )
    }
    res.json({ booking: await serializeBookingInFull(await cancelBooking(context, booking), config) })
  })

  /**
   * "Payment done": the customer uploads proof of an open payment request, a screenshot or PDF of
   * the confirmation. A guest sends the guest code in the `X-Guest-Code` header, as the body is the
   * file. A new upload replaces the last one. The payment stays requested until the team has
   * checked the proof and marks it received.
   */
  router.post(
    '/:reference/payments/:id/proof',
    rateLimit({ name: 'proof', windowMs: 60_000, limit: 10 }),
    express.raw({ type: PROOF_TYPES, limit: PROOF_MAX_BYTES }),
    async (req, res) => {
      const booking = await findBookingByReference(normalizeReference(String(req.params.reference)))
      const isOwner = Boolean(booking && req.user && booking.userId === req.user.id)
      const byGuest = Boolean(booking && booking.userId === null && guestCodeMatches(booking, req.get('x-guest-code')))
      if (!booking || !(isOwner || byGuest)) throw notFound('BOOKING_NOT_FOUND', 'We could not find a booking with that reference and guest code.')
      if (booking.status !== 'pending' && booking.status !== 'confirmed') throw conflict('BOOKING_CLOSED', `A ${booking.status} booking cannot take a payment.`)

      const id = String(req.params.id)
      const [payment] = isUuid(id) ? await db.select().from(bookingPayments).where(and(eq(bookingPayments.id, id), eq(bookingPayments.bookingId, booking.id))) : []
      if (!payment) throw notFound('PAYMENT_NOT_FOUND', 'Payment request not found.')
      if (payment.status !== 'requested') throw conflict('PAYMENT_CLOSED', `This payment is already ${payment.status}.`)

      const bytes: unknown = req.body
      const contentType = Buffer.isBuffer(bytes) && bytes.length > 0 ? sniffProofType(bytes) : null
      if (!Buffer.isBuffer(bytes) || !contentType) throw badRequest('UNSUPPORTED_PROOF', 'Upload a screenshot (JPEG, PNG or WebP) or a PDF of your payment confirmation.')

      const now = new Date()
      const file = { contentType, size: bytes.length, data: bytes, uploadedAt: now }
      await db.insert(paymentProofs).values({ paymentId: payment.id, ...file }).onConflictDoUpdate({ target: paymentProofs.paymentId, set: file })
      await db.update(bookingPayments).set({ proofUploadedAt: now }).where(eq(bookingPayments.id, payment.id))
      await recordEvent(booking.id, 'payment_proof', null, [
        { field: 'paymentKind', from: null, to: payment.kind },
        { field: 'paymentAmountCents', from: null, to: String(payment.amountCents) },
      ])
      res.json({ booking: await serializeBookingInFull(booking, config) })
    },
  )

  return router
}
