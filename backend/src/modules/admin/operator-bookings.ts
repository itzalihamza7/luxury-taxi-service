import { eq } from 'drizzle-orm'
import { Router } from 'express'
import { z } from 'zod'
import type { AppContext } from '../../context.js'
import { db } from '../../db/client.js'
import { users, type User } from '../../db/schema.js'
import { phoneMatches } from '../../lib/phone.js'
import { blankAsMissing, email, locale, optionalText, parse, personName, phone } from '../../lib/validate.js'
import { createBooking, serializeBooking } from '../bookings/service.js'
import { createQuote } from '../quotes/routes.js'

/*
 * Bookings an operator enters for a customer who called or wrote on WhatsApp.
 * They are priced like any other booking, start out confirmed, and need only
 * one way to reach the customer: an email address or a phone number.
 */

const contactSchema = z
  .object({
    name: personName,
    email: blankAsMissing(email),
    phone: blankAsMissing(phone),
    company: optionalText(120),
    notes: optionalText(1000),
  })
  // Reported on the phone field, as "required": either that or an email address is needed.
  .refine((contact) => contact.email !== undefined || contact.phone !== undefined, { message: 'required', path: ['phone'] })

const bookingSchema = z.object({
  quoteId: z.uuid(),
  vehicleId: z.uuid(),
  contact: contactSchema,
  flightNumber: optionalText(12),
  /** A price agreed with the customer, in cents. Left out, the calculated price applies. */
  priceCents: z.number().int().min(0).max(1_000_000).nullish(),
  /** Put the booking in the customer's account when the email or number belongs to one. */
  linkAccount: z.boolean().default(true),
  locale,
})

const matchSchema = z.object({ email: blankAsMissing(email), phone: blankAsMissing(phone) })

/**
 * The account an email address or phone number belongs to. A number shared by
 * several accounts identifies none of them.
 */
async function findAccount(contact: { email?: string; phone?: string }): Promise<User | undefined> {
  if (contact.email) {
    const [byEmail] = await db.select().from(users).where(eq(users.email, contact.email))
    if (byEmail) return byEmail
  }
  if (contact.phone) {
    const byPhone = await db.select().from(users).where(phoneMatches(users.phone, contact.phone)).limit(2)
    if (byPhone.length === 1) return byPhone[0]
  }
  return undefined
}

const summary = (account: User) => ({ name: account.name, email: account.email, phone: account.phone })

/** Mounted behind `requireAdmin`. */
export function operatorBookingsRouter(context: AppContext): Router {
  const router = Router()

  /** Prices for a journey. Unlike on the website, the ride may leave right away. */
  router.post('/quotes', async (req, res) => {
    res.status(201).json({ quote: await createQuote(context, req.body, { byOperator: true }) })
  })

  /** Lets the form say whose account a booking will appear in, before it is saved. */
  router.get('/customers/match', async (req, res) => {
    const account = await findAccount(parse(matchSchema, req.query))
    res.json({ account: account ? summary(account) : null })
  })

  router.post('/bookings', async (req, res) => {
    const input = parse(bookingSchema, req.body)
    const account = input.linkAccount ? await findAccount(input.contact) : undefined

    const { booking, created } = await createBooking(
      context,
      {
        quoteId: input.quoteId,
        vehicleId: input.vehicleId,
        contact: { ...input.contact, email: input.contact.email ?? null, phone: input.contact.phone ?? null },
        flightNumber: input.flightNumber,
        // Taken by phone: the customer pays the chauffeur, or the operator records the payment later.
        paymentMethod: 'chauffeur',
        locale: input.locale,
      },
      undefined,
      { userId: account?.id ?? null, totalCents: input.priceCents, actor: { id: req.user!.id, name: req.user!.name } },
    )
    res.status(created ? 201 : 200).json({
      // With the guest code, for the message the operator sends the customer.
      booking: { ...serializeBooking(booking, context.config), guestCode: booking.guestCode },
      /** The account the booking now appears in, if any. */
      account: account ? summary(account) : null,
    })
  })

  return router
}
