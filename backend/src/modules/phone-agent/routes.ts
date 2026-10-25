import { and, asc, gte, inArray } from 'drizzle-orm'
import { Router } from 'express'
import { z } from 'zod'
import type { AppContext } from '../../context.js'
import { db } from '../../db/client.js'
import { bookings } from '../../db/schema.js'
import { phoneMatches } from '../../lib/phone.js'
import { parse, phone } from '../../lib/validate.js'
import { serializeBooking } from '../bookings/service.js'
import { requirePhoneAgent } from './keys.js'

const upcomingSchema = z.object({ phone })

/** Endpoints only the business's AI phone agent may use (with its key). */
export function phoneAgentRouter({ config }: AppContext): Router {
  const router = Router()
  router.use(requirePhoneAgent)

  /**
   * The upcoming bookings made with a phone number: what a caller means by "my pickup".
   * The agent fills the number in from the line the call comes from, not from what the caller
   * says, so a caller only hears about their own bookings.
   */
  router.get('/bookings', async (req, res) => {
    const input = parse(upcomingSchema, req.query)
    const rows = await db
      .select()
      .from(bookings)
      .where(
        and(
          phoneMatches(bookings.contactPhone, input.phone),
          inArray(bookings.status, ['pending', 'confirmed', 'in_progress']),
          // Include rides that started recently, for "where is my driver?".
          gte(bookings.pickupAt, new Date(Date.now() - 2 * 60 * 60 * 1000)),
        ),
      )
      .orderBy(asc(bookings.pickupAt))
      .limit(10)
    res.json({ bookings: rows.map((row) => serializeBooking(row, config)) })
  })

  return router
}
