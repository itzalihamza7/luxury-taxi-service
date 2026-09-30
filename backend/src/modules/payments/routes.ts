import { eq } from 'drizzle-orm'
import { Router } from 'express'
import { z } from 'zod'
import type { AppContext } from '../../context.js'
import { db } from '../../db/client.js'
import { bookings } from '../../db/schema.js'
import { badRequest, HttpError, notFound } from '../../lib/errors.js'
import { parse } from '../../lib/validate.js'
import { serializeBooking } from '../bookings/service.js'
import { PaymentError } from './paypal.js'

const captureSchema = z.object({
  /** The PayPal order id, returned to the site as the `token` query parameter. */
  orderId: z.string().trim().min(5).max(64),
})

export function paymentsRouter({ config, payments, rateLimit }: AppContext): Router {
  const router = Router()

  /**
   * Called when the customer returns from PayPal after approving the payment.
   * The order id is unguessable and tied to exactly one booking, so knowing it
   * is what authorises seeing that booking's confirmation.
   */
  router.post('/paypal/capture', rateLimit({ name: 'capture', windowMs: 60_000, limit: 20 }), async (req, res) => {
    const { orderId } = parse(captureSchema, req.body)
    if (!payments.enabled) throw badRequest('PAYMENTS_UNAVAILABLE', 'Online payment is not available.')

    const [booking] = await db.select().from(bookings).where(eq(bookings.paymentRef, orderId))
    if (!booking) throw notFound('BOOKING_NOT_FOUND', 'We could not match this payment to a booking.')

    // Refreshing the return page must not capture twice.
    if (booking.paymentStatus === 'paid') {
      res.json({ booking: serializeBooking(booking, config) })
      return
    }

    let result
    try {
      result = await payments.captureOrder(orderId)
    } catch (error) {
      if (!(error instanceof PaymentError)) throw error
      console.error('[payments]', error.message)
      throw new HttpError(502, 'PAYMENT_NOT_COMPLETED', 'The payment could not be completed. You have not been charged twice; please contact us.')
    }

    const amountMatches = result.amountCents === booking.totalCents && result.currency === booking.currency
    if (!result.completed || !amountMatches) {
      console.error(`[payments] capture for ${booking.reference} not accepted:`, result)
      throw new HttpError(502, 'PAYMENT_NOT_COMPLETED', 'The payment could not be completed. Please contact us.')
    }

    const now = new Date()
    const [paid] = await db
      .update(bookings)
      .set({ paymentStatus: 'paid', paidAt: now, updatedAt: now })
      .where(eq(bookings.id, booking.id))
      .returning()
    res.json({ booking: serializeBooking(paid ?? booking, config) })
  })

  return router
}
