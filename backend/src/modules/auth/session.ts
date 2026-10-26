import { createHash, randomBytes } from 'node:crypto'
import { and, eq, gt, lt } from 'drizzle-orm'
import type { Request, RequestHandler, Response } from 'express'
import { db } from '../../db/client.js'
import { sessions, users, type User } from '../../db/schema.js'
import { forbidden, unauthorized } from '../../lib/errors.js'

export const SESSION_COOKIE = 'sid'

export type SessionUser = Pick<User, 'id' | 'email' | 'name' | 'phone' | 'role' | 'emailVerifiedAt'>

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      /** Set by `attachUser` when the request carries a valid session cookie. */
      user?: SessionUser
    }
  }
}

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex')

/** The account as its owner sees it. */
export function publicUser(user: SessionUser) {
  return { id: user.id, email: user.email, name: user.name, phone: user.phone, role: user.role, emailVerified: user.emailVerifiedAt !== null }
}

function readCookie(req: Request, name: string): string | undefined {
  const header = req.headers.cookie
  if (!header) return undefined
  for (const pair of header.split(';')) {
    const separator = pair.indexOf('=')
    if (separator > 0 && pair.slice(0, separator).trim() === name) {
      return decodeURIComponent(pair.slice(separator + 1).trim())
    }
  }
  return undefined
}

/** Create a session and set its cookie. Only a hash of the token is stored. */
export async function startSession(req: Request, res: Response, userId: string, ttlDays: number): Promise<void> {
  const token = randomBytes(32).toString('base64url')
  const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000)

  await db.delete(sessions).where(lt(sessions.expiresAt, new Date()))
  await db.insert(sessions).values({ userId, tokenHash: hashToken(token), expiresAt })

  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    // `req.secure` honours X-Forwarded-Proto from the trusted proxy in front of the API.
    secure: req.secure,
    path: '/',
    expires: expiresAt,
  })
}

export async function endSession(req: Request, res: Response): Promise<void> {
  const token = readCookie(req, SESSION_COOKIE)
  if (token) await db.delete(sessions).where(eq(sessions.tokenHash, hashToken(token)))
  res.clearCookie(SESSION_COOKIE, { httpOnly: true, sameSite: 'lax', secure: req.secure, path: '/' })
}

/** Resolve the session cookie to a user, if there is one. Never rejects the request. */
export const attachUser: RequestHandler = async (req, _res, next) => {
  const token = readCookie(req, SESSION_COOKIE)
  if (token) {
    const [row] = await db
      .select({ id: users.id, email: users.email, name: users.name, phone: users.phone, role: users.role, emailVerifiedAt: users.emailVerifiedAt })
      .from(sessions)
      .innerJoin(users, eq(users.id, sessions.userId))
      .where(and(eq(sessions.tokenHash, hashToken(token)), gt(sessions.expiresAt, new Date())))
    if (row) req.user = row
  }
  next()
}

export const requireUser: RequestHandler = (req, _res, next) => {
  next(req.user ? undefined : unauthorized())
}

/** Admins and super admins run the business; customers only see their own bookings. */
export const isStaff = (user: Pick<SessionUser, 'role'> | undefined): boolean => user?.role === 'admin' || user?.role === 'superadmin'

export const requireAdmin: RequestHandler = (req, _res, next) => {
  if (!req.user) next(unauthorized())
  else if (!isStaff(req.user)) next(forbidden())
  else next()
}
