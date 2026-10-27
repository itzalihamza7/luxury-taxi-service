import { createHash, randomBytes } from 'node:crypto'
import { and, eq, gt, isNull, lt, sql } from 'drizzle-orm'
import { Router } from 'express'
import { z } from 'zod'
import type { AppContext } from '../../context.js'
import { db } from '../../db/client.js'
import { passwordResets, sessions, users } from '../../db/schema.js'
import { badRequest } from '../../lib/errors.js'
import { hashPassword } from '../../lib/password.js'
import { email, locale, parse } from '../../lib/validate.js'
import { passwordChangedEmail, resetEmail } from './emails.js'
import { clearFailedLogins } from './login-throttle.js'
import { publicUser, startSession } from './session.js'

const forgotSchema = z.object({ email, locale })
const resetSchema = z.object({
  token: z.string().trim().min(20).max(200),
  password: z.string().min(8).max(128),
  locale,
})

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex')

/** Links asked for per account within an hour; more are silently not sent. */
const MAX_LINKS_PER_HOUR = 3

export function passwordResetRouter({ config, mailer, rateLimit }: AppContext): Router {
  const router = Router()

  /**
   * Always answers the same, whether or not the email has an account, and
   * sends in the background so the response time does not tell either.
   */
  router.post('/forgot', rateLimit({ name: 'forgot', windowMs: 10 * 60_000, limit: 5 }), async (req, res) => {
    const input = parse(forgotSchema, req.body)
    res.json({ ok: true })

    void (async () => {
      const [user] = await db.select().from(users).where(eq(users.email, input.email))
      if (!user) return
      const recent = await db
        .select({ id: passwordResets.id })
        .from(passwordResets)
        .where(and(eq(passwordResets.userId, user.id), gt(passwordResets.createdAt, new Date(Date.now() - 3_600_000))))
      if (recent.length >= MAX_LINKS_PER_HOUR) return

      const token = randomBytes(32).toString('base64url')
      const now = new Date()
      // A new link replaces any earlier one: those stop working, but still count towards the hourly limit.
      await db.update(passwordResets).set({ expiresAt: now }).where(and(eq(passwordResets.userId, user.id), isNull(passwordResets.usedAt), gt(passwordResets.expiresAt, now)))
      await db.delete(passwordResets).where(lt(passwordResets.createdAt, new Date(Date.now() - 86_400_000)))
      await db.insert(passwordResets).values({
        userId: user.id,
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + config.RESET_TOKEN_TTL_MINUTES * 60_000),
      })
      const url = `${config.APP_URL.replace(/\/+$/, '')}/${input.locale}/reset-password?token=${token}`
      await mailer.send(resetEmail(user.email, user.name.split(' ')[0] ?? user.name, url, config.RESET_TOKEN_TTL_MINUTES, input.locale, config.APP_URL))
    })().catch((error: unknown) => console.error('[password-reset] could not send the link:', error instanceof Error ? error.message : error))
  })

  /** Sets the new password, ends every session of the account and signs this browser in. */
  router.post('/reset', rateLimit({ name: 'reset', windowMs: 10 * 60_000, limit: 10 }), async (req, res) => {
    const input = parse(resetSchema, req.body)
    const now = new Date()
    // Claimed in one statement, so the same link cannot be used twice at once.
    const [claimed] = await db
      .update(passwordResets)
      .set({ usedAt: now })
      .where(and(eq(passwordResets.tokenHash, hashToken(input.token)), isNull(passwordResets.usedAt), gt(passwordResets.expiresAt, now)))
      .returning({ userId: passwordResets.userId })
    if (!claimed) throw badRequest('RESET_LINK_INVALID', 'This link has expired or was already used. Please ask for a new one.')

    const [user] = await db
      .update(users)
      // The link came by email, so the address is the customer's.
      .set({ passwordHash: await hashPassword(input.password), emailVerifiedAt: sql`coalesce(${users.emailVerifiedAt}, now())`, updatedAt: now })
      .where(eq(users.id, claimed.userId))
      .returning()
    if (!user) throw badRequest('RESET_LINK_INVALID', 'This link has expired or was already used. Please ask for a new one.')

    await db.delete(sessions).where(eq(sessions.userId, user.id))
    await db.delete(passwordResets).where(eq(passwordResets.userId, user.id))
    clearFailedLogins(user.email)
    await startSession(req, res, user.id, config.SESSION_TTL_DAYS)
    res.json({ user: publicUser(user) })

    mailer.send(passwordChangedEmail(user.email, user.name.split(' ')[0] ?? user.name, input.locale, config.APP_URL)).catch((error: unknown) => {
      console.error('[password-reset] could not send the confirmation:', error instanceof Error ? error.message : error)
    })
  })

  return router
}
