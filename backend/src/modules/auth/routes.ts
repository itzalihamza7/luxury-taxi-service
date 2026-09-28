import { eq } from 'drizzle-orm'
import { Router } from 'express'
import { z } from 'zod'
import type { AppContext } from '../../context.js'
import { db } from '../../db/client.js'
import { users } from '../../db/schema.js'
import { conflict, unauthorized } from '../../lib/errors.js'
import { DUMMY_HASH, hashPassword, verifyPassword } from '../../lib/password.js'
import { email, parse, personName, phone } from '../../lib/validate.js'
import { endSession, publicUser, requireUser, startSession } from './session.js'

const optionalPhone = z.preprocess((value) => (value === '' || value === null ? undefined : value), phone.optional())

const registerSchema = z.object({
  name: personName,
  email,
  password: z.string().min(8).max(128),
  phone: optionalPhone,
})

const loginSchema = z.object({
  email,
  password: z.string().min(1).max(128),
})

const profileSchema = z.object({
  name: personName,
  phone: optionalPhone,
})

const isUniqueViolation = (error: unknown) =>
  typeof error === 'object' && error !== null && 'code' in error && (error as { code: unknown }).code === '23505'

export function authRouter({ config, rateLimit }: AppContext): Router {
  const router = Router()

  router.post('/register', rateLimit({ name: 'register', windowMs: 60_000, limit: 5 }), async (req, res) => {
    const input = parse(registerSchema, req.body)
    const passwordHash = await hashPassword(input.password)

    let user
    try {
      ;[user] = await db
        .insert(users)
        .values({ name: input.name, email: input.email, phone: input.phone ?? null, passwordHash })
        .returning()
    } catch (error) {
      // drizzle wraps the driver error; the Postgres code is on the cause.
      const cause = (error as { cause?: unknown }).cause ?? error
      if (isUniqueViolation(cause)) throw conflict('EMAIL_TAKEN', 'An account with this email already exists.')
      throw error
    }
    if (!user) throw new Error('user insert returned no row')

    await startSession(req, res, user.id, config.SESSION_TTL_DAYS)
    res.status(201).json({ user: publicUser(user) })
  })

  router.post('/login', rateLimit({ name: 'login', windowMs: 60_000, limit: 10 }), async (req, res) => {
    const input = parse(loginSchema, req.body)
    const [user] = await db.select().from(users).where(eq(users.email, input.email))

    // Verify against a dummy hash for unknown emails so response time does not reveal which emails exist.
    const valid = await verifyPassword(input.password, user?.passwordHash ?? (await DUMMY_HASH))
    if (!user || !valid) throw unauthorized('INVALID_CREDENTIALS', 'Email or password is incorrect.')

    await startSession(req, res, user.id, config.SESSION_TTL_DAYS)
    res.json({ user: publicUser(user) })
  })

  router.post('/logout', async (req, res) => {
    await endSession(req, res)
    res.json({ ok: true })
  })

  /** Returns `{ user: null }` rather than a 401 so the header can check quietly on every page. */
  router.get('/me', (req, res) => {
    res.json({ user: req.user ? publicUser(req.user) : null })
  })

  router.patch('/me', requireUser, async (req, res) => {
    const input = parse(profileSchema, req.body)
    const [user] = await db
      .update(users)
      .set({ name: input.name, phone: input.phone ?? null, updatedAt: new Date() })
      .where(eq(users.id, req.user!.id))
      .returning()
    if (!user) throw unauthorized()
    res.json({ user: publicUser(user) })
  })

  return router
}
