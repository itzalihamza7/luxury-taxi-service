import { and, asc, count, desc, eq, gte, ilike, or, type SQL } from 'drizzle-orm'
import { Router } from 'express'
import { z } from 'zod'
import type { AppContext } from '../../context.js'
import { db } from '../../db/client.js'
import { bookings, contactMessages, newsletterSubscribers, type BookingStatus } from '../../db/schema.js'
import { conflict, notFound } from '../../lib/errors.js'
import { normalizeReference } from '../../lib/reference.js'
import { parse } from '../../lib/validate.js'
import { requireAdmin } from '../auth/session.js'
import { findBookingByReference, serializeBooking } from '../bookings/service.js'
import { analyticsAdminRouter } from '../analytics/routes.js'
import { usersAdminRouter } from '../users/admin.js'
import { agentKeysAdminRouter } from '../phone-agent/admin.js'
import { contentAdminRouter } from '../content/routes.js'
import { mediaAdminRouter } from '../media/routes.js'
import { CATALOG } from '../places/catalog.js'
import { vehiclesAdminRouter } from '../vehicles/admin.js'
import { operatorBookingsRouter } from './operator-bookings.js'

const STATUSES = ['pending', 'confirmed', 'in_progress', 'completed', 'cancelled'] as const

/** A booking only ever moves forward; completed and cancelled are final. */
const TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['in_progress', 'completed', 'cancelled'],
  in_progress: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
}

const listSchema = z.object({
  status: z.enum(STATUSES).optional(),
  q: z.string().trim().max(100).optional(),
  /** `upcoming` lists the rides still to come, soonest first, instead of the newest bookings first. */
  view: z.enum(['upcoming']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
})

const updateSchema = z
  .object({
    status: z.enum(STATUSES).optional(),
    paymentStatus: z.enum(['unpaid', 'paid']).optional(),
  })
  .refine((value) => value.status !== undefined || value.paymentStatus !== undefined, { message: 'required', path: ['status'] })

const pageSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
})

/** Rides that are still to come: not started, completed or cancelled. */
const upcomingRides = () => and(gte(bookings.pickupAt, new Date()), or(eq(bookings.status, 'pending'), eq(bookings.status, 'confirmed')))

/** Escape LIKE wildcards so a search for "50%" matches literally. */
const likePattern = (term: string) => `%${term.replace(/[\\%_]/g, '\\$&')}%`

export function adminRouter(context: AppContext): Router {
  const { config } = context
  const router = Router()
  router.use(requireAdmin)

  router.use('/vehicles', vehiclesAdminRouter())
  router.use('/media', mediaAdminRouter())
  router.use(contentAdminRouter())
  router.use(operatorBookingsRouter(context))
  router.use(analyticsAdminRouter())
  router.use(usersAdminRouter(context))
  router.use(agentKeysAdminRouter())

  /** Places a route or event can point at, so "book this" opens with the destination filled in. */
  router.get('/places', (_req, res) => {
    res.json({ places: CATALOG.map((place) => ({ id: `cat:${place.id}`, kind: place.kind, name: place.name })) })
  })

  router.get('/summary', async (_req, res) => {
    const byStatus = await db.select({ status: bookings.status, total: count() }).from(bookings).groupBy(bookings.status)
    const [upcoming] = await db.select({ total: count() }).from(bookings).where(upcomingRides())
    const [messages] = await db.select({ total: count() }).from(contactMessages)
    const [subscribers] = await db.select({ total: count() }).from(newsletterSubscribers)

    const statusCounts = Object.fromEntries(STATUSES.map((status) => [status, 0])) as Record<BookingStatus, number>
    for (const row of byStatus) statusCounts[row.status] = row.total

    res.json({
      bookings: statusCounts,
      upcoming: upcoming?.total ?? 0,
      messages: messages?.total ?? 0,
      subscribers: subscribers?.total ?? 0,
    })
  })

  router.get('/bookings', async (req, res) => {
    const { status, q, view, page, pageSize } = parse(listSchema, req.query)

    const filters: SQL[] = []
    if (status) filters.push(eq(bookings.status, status))
    const upcoming = view === 'upcoming' ? upcomingRides() : undefined
    if (upcoming) filters.push(upcoming)
    if (q) {
      const pattern = likePattern(q)
      const search = or(
        ilike(bookings.reference, pattern),
        ilike(bookings.contactName, pattern),
        ilike(bookings.contactEmail, pattern),
        ilike(bookings.contactPhone, pattern),
      )
      if (search) filters.push(search)
    }
    const where = filters.length > 0 ? and(...filters) : undefined

    const [totals] = await db.select({ total: count() }).from(bookings).where(where)
    const rows = await db
      .select()
      .from(bookings)
      .where(where)
      .orderBy(view === 'upcoming' ? asc(bookings.pickupAt) : desc(bookings.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize)

    res.json({
      bookings: rows.map((row) => serializeBooking(row, config)),
      total: totals?.total ?? 0,
      page,
      pageSize,
    })
  })

  router.patch('/bookings/:reference', async (req, res) => {
    const input = parse(updateSchema, req.body)
    const booking = await findBookingByReference(normalizeReference(String(req.params.reference)))
    if (!booking) throw notFound('BOOKING_NOT_FOUND', 'Booking not found.')

    const now = new Date()
    const changes: Partial<typeof bookings.$inferInsert> = { updatedAt: now }

    if (input.status && input.status !== booking.status) {
      if (!TRANSITIONS[booking.status].includes(input.status)) {
        throw conflict('INVALID_STATUS_CHANGE', `A ${booking.status} booking cannot be moved to ${input.status}.`)
      }
      changes.status = input.status
      if (input.status === 'cancelled') changes.cancelledAt = now
    }
    if (input.paymentStatus && input.paymentStatus !== booking.paymentStatus) {
      changes.paymentStatus = input.paymentStatus
      changes.paidAt = input.paymentStatus === 'paid' ? now : null
    }

    const [updated] = await db.update(bookings).set(changes).where(eq(bookings.id, booking.id)).returning()
    res.json({ booking: serializeBooking(updated ?? booking, config) })
  })

  router.get('/messages', async (req, res) => {
    const { page, pageSize } = parse(pageSchema, req.query)
    const [totals] = await db.select({ total: count() }).from(contactMessages)
    const rows = await db
      .select()
      .from(contactMessages)
      .orderBy(desc(contactMessages.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize)

    res.json({
      messages: rows.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() })),
      total: totals?.total ?? 0,
      page,
      pageSize,
    })
  })

  return router
}
