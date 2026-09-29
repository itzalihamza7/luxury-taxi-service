import { Router } from 'express'
import { z } from 'zod'
import type { AppContext } from '../../context.js'
import { conflict, forbidden, notFound } from '../../lib/errors.js'
import { normalizeReference } from '../../lib/reference.js'
import { email, locale, optionalText, parse, personName, phone } from '../../lib/validate.js'
import { requireUser } from '../auth/session.js'
import {
  cancelBooking,
  canCancel,
  createBooking,
  findBookingByReference,
  listBookingsForUser,
  serializeBooking,
} from './service.js'

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

const lookupSchema = z.object({
  reference: z.string().trim().min(4).max(20),
  email,
})

const cancelSchema = z.object({
  /** Required for guests; signed-in owners are identified by their session. */
  email: email.optional(),
})

const bookingNotFound = () =>
  notFound('BOOKING_NOT_FOUND', 'We could not find a booking with that reference and email.')

export function bookingsRouter(context: AppContext): Router {
  const { config, rateLimit } = context
  const router = Router()

  /** Create a booking from a quote. Works for guests and signed-in customers alike. */
  router.post('/', rateLimit({ name: 'bookings', windowMs: 60_000, limit: 10 }), async (req, res) => {
    const input = parse(createSchema, req.body)
    const { booking, approveUrl, created } = await createBooking(context, input, req.user)
    res.status(created ? 201 : 200).json({
      booking: serializeBooking(booking, config),
      /** Present when the customer chose to pay online: redirect them here. */
      payment: approveUrl ? { approveUrl } : null,
    })
  })

  /** The signed-in customer's bookings, newest pickup first. */
  router.get('/', requireUser, async (req, res) => {
    const rows = await listBookingsForUser(req.user!.id)
    res.json({ bookings: rows.map((row) => serializeBooking(row, config)) })
  })

  /**
   * Guest tracking: the reference alone is not enough, the booking email must
   * match too. Both failures look identical so references cannot be probed.
   */
  router.post('/lookup', rateLimit({ name: 'lookup', windowMs: 60_000, limit: 10 }), async (req, res) => {
    const input = parse(lookupSchema, req.body)
    const booking = await findBookingByReference(normalizeReference(input.reference))
    if (!booking || booking.contactEmail !== input.email) throw bookingNotFound()
    res.json({ booking: serializeBooking(booking, config) })
  })

  router.get('/:reference', requireUser, async (req, res) => {
    const booking = await findBookingByReference(normalizeReference(String(req.params.reference)))
    if (!booking) throw bookingNotFound()
    if (booking.userId !== req.user!.id && req.user!.role !== 'admin') throw forbidden()
    res.json({ booking: serializeBooking(booking, config) })
  })

  router.post('/:reference/cancel', rateLimit({ name: 'cancel', windowMs: 60_000, limit: 10 }), async (req, res) => {
    const input = parse(cancelSchema, req.body ?? {})
    const booking = await findBookingByReference(normalizeReference(String(req.params.reference)))

    const isOwner = Boolean(booking && req.user && booking.userId === req.user.id)
    const emailMatches = Boolean(booking && input.email && booking.contactEmail === input.email)
    if (!booking || !(isOwner || emailMatches)) throw bookingNotFound()

    if (booking.status === 'cancelled') {
      res.json({ booking: serializeBooking(booking, config) })
      return
    }
    if (!canCancel(booking, config)) {
      throw conflict(
        'CANCEL_WINDOW_PASSED',
        `Online cancellation closes ${config.FREE_CANCEL_HOURS} hours before pickup. Please contact us.`,
      )
    }
    res.json({ booking: serializeBooking(await cancelBooking(booking), config) })
  })

  return router
}
