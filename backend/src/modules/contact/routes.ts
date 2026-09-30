import { Router } from 'express'
import { z } from 'zod'
import type { AppContext } from '../../context.js'
import { db } from '../../db/client.js'
import { contactMessages, newsletterSubscribers } from '../../db/schema.js'
import { email, locale, parse, personName, phone } from '../../lib/validate.js'

const messageSchema = z.object({
  name: personName,
  email,
  phone: z.preprocess((value) => (value === '' || value === null ? undefined : value), phone.optional()),
  subject: z.string().trim().min(2).max(150),
  message: z.string().trim().min(10).max(4000),
  locale,
  /** Honeypot: hidden from people, so only bots fill it in. */
  website: z.string().max(200).optional(),
})

const subscribeSchema = z.object({ email, locale })

export function contactRouter({ rateLimit }: AppContext): Router {
  const router = Router()

  router.post('/contact', rateLimit({ name: 'contact', windowMs: 10 * 60_000, limit: 5 }), async (req, res) => {
    const input = parse(messageSchema, req.body)
    if (!input.website) {
      await db.insert(contactMessages).values({
        name: input.name,
        email: input.email,
        phone: input.phone ?? null,
        subject: input.subject,
        message: input.message,
        locale: input.locale,
      })
    }
    // Bots get the same answer as people, so they learn nothing.
    res.status(201).json({ ok: true })
  })

  router.post('/newsletter', rateLimit({ name: 'newsletter', windowMs: 10 * 60_000, limit: 5 }), async (req, res) => {
    const input = parse(subscribeSchema, req.body)
    // Already subscribed is not an error, and saying so would reveal who is on the list.
    await db.insert(newsletterSubscribers).values(input).onConflictDoNothing({ target: newsletterSubscribers.email })
    res.status(201).json({ ok: true })
  })

  return router
}
