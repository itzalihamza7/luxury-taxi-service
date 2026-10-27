import { createHash, randomInt } from 'node:crypto'
import { and, desc, eq, gt, isNull, sql } from 'drizzle-orm'
import { Router } from 'express'
import { z } from 'zod'
import type { AppContext } from '../../context.js'
import { db } from '../../db/client.js'
import { emailVerifications, users } from '../../db/schema.js'
import { badRequest } from '../../lib/errors.js'
import type { Mailer } from '../../lib/mailer.js'
import { locale, parse } from '../../lib/validate.js'
import { verifyEmailCodeEmail } from '../bookings/emails.js'
import { claimBookingsByVerifiedEmail } from '../bookings/flow.js'
import { publicUser, requireUser, type SessionUser } from './session.js'

/*
 * A customer proves their email address is theirs with a six-digit code sent to it. Until then the
 * bookings made with that address stay out of their account: anyone can sign up with any address.
 */

const CODE_MINUTES = 30
const MAX_ATTEMPTS = 5

const hashCode = (code: string) => createHash('sha256').update(code).digest('hex')
const requestSchema = z.object({ locale })
const verifySchema = z.object({ code: z.string().trim().regex(/^\d{6}$/, 'invalid_code') })

/** Sends a new code (the previous ones stop working). */
export async function sendVerificationCode(mailer: Mailer, user: Pick<SessionUser, 'id' | 'email' | 'name'>, language: 'en' | 'es', appUrl: string): Promise<void> {
  const code = String(randomInt(0, 1_000_000)).padStart(6, '0')
  await db.update(emailVerifications).set({ usedAt: new Date() }).where(and(eq(emailVerifications.userId, user.id), isNull(emailVerifications.usedAt)))
  await db.insert(emailVerifications).values({ userId: user.id, email: user.email, codeHash: hashCode(code), expiresAt: new Date(Date.now() + CODE_MINUTES * 60_000) })
  await mailer.send(verifyEmailCodeEmail(user.email, user.name, code, CODE_MINUTES, language, appUrl))
}

export function verifyEmailRouter({ config, mailer, rateLimit }: AppContext): Router {
  const router = Router()

  router.post('/email/send-code', requireUser, rateLimit({ name: 'verify-send', windowMs: 10 * 60_000, limit: 5 }), async (req, res) => {
    const input = parse(requestSchema, req.body ?? {})
    if (req.user!.emailVerifiedAt) {
      res.json({ sent: false, user: publicUser(req.user!) })
      return
    }
    await sendVerificationCode(mailer, req.user!, input.locale, config.APP_URL)
    res.json({ sent: true })
  })

  /** Confirms the address and adds the bookings made with it to the account. */
  router.post('/email/verify', requireUser, rateLimit({ name: 'verify', windowMs: 10 * 60_000, limit: 15 }), async (req, res) => {
    const input = parse(verifySchema, req.body)
    const user = req.user!
    const now = new Date()
    const [pending] = await db
      .select()
      .from(emailVerifications)
      .where(and(eq(emailVerifications.userId, user.id), eq(emailVerifications.email, user.email), isNull(emailVerifications.usedAt), gt(emailVerifications.expiresAt, now)))
      .orderBy(desc(emailVerifications.createdAt))
      .limit(1)
    if (!pending || pending.attempts >= MAX_ATTEMPTS) throw badRequest('CODE_EXPIRED', 'This code has expired. Please ask for a new one.')
    if (pending.codeHash !== hashCode(input.code)) {
      await db.update(emailVerifications).set({ attempts: sql`${emailVerifications.attempts} + 1` }).where(eq(emailVerifications.id, pending.id))
      throw badRequest('CODE_INVALID', 'That code is not right. Please check the email and try again.', { code: 'invalid_code' })
    }
    await db.update(emailVerifications).set({ usedAt: now }).where(eq(emailVerifications.id, pending.id))
    const [verified] = await db.update(users).set({ emailVerifiedAt: now, updatedAt: now }).where(eq(users.id, user.id)).returning()
    const linkedBookings = verified ? await claimBookingsByVerifiedEmail(verified) : 0
    res.json({ user: publicUser(verified ?? user), linkedBookings })
  })

  return router
}
