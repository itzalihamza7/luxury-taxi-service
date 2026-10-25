import { createHash, randomBytes } from 'node:crypto'
import { and, eq, isNull } from 'drizzle-orm'
import type { RequestHandler } from 'express'
import { db } from '../../db/client.js'
import { agentKeys } from '../../db/schema.js'
import { unauthorized } from '../../lib/errors.js'

/*
 * Keys for the business's AI phone agent. The agent sends one as `Authorization: Bearer smk_…`.
 * A request with a key is the agent's: its rate limits are per key, it may use `/api/agent`, and
 * its bookings are marked "agent". A request without one works exactly as before.
 */

export const KEY_PREFIX = 'smk_'

export interface PhoneAgent {
  id: string
  name: string
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      /** Set by `attachPhoneAgent` when the request carries a valid agent key. */
      phoneAgent?: PhoneAgent
    }
  }
}

export const hashKey = (key: string) => createHash('sha256').update(key).digest('hex')

/** A new key: shown to the admin once; only its hash and first characters are stored. */
export function newAgentKey(): { key: string; keyHash: string; prefix: string } {
  const key = KEY_PREFIX + randomBytes(24).toString('base64url')
  return { key, keyHash: hashKey(key), prefix: key.slice(0, 10) }
}

/** When each key was last recorded as used, so a busy agent doesn't write on every request. */
const lastRecorded = new Map<string, number>()

/** Resolve an agent key, if the request has one. A key that is wrong or revoked is refused. */
export const attachPhoneAgent: RequestHandler = async (req, _res, next) => {
  const header = req.headers.authorization
  const key = header?.startsWith(`Bearer ${KEY_PREFIX}`) ? header.slice('Bearer '.length).trim() : null
  if (!key) return next()

  const [row] = await db
    .select({ id: agentKeys.id, name: agentKeys.name })
    .from(agentKeys)
    .where(and(eq(agentKeys.keyHash, hashKey(key)), isNull(agentKeys.revokedAt)))
  if (!row) return next(unauthorized('INVALID_AGENT_KEY', 'This agent key is not valid.'))

  req.phoneAgent = row
  const now = Date.now()
  if (now - (lastRecorded.get(row.id) ?? 0) > 60_000) {
    lastRecorded.set(row.id, now)
    await db.update(agentKeys).set({ lastUsedAt: new Date(now) }).where(eq(agentKeys.id, row.id))
  }
  next()
}

export const requirePhoneAgent: RequestHandler = (req, _res, next) => {
  next(req.phoneAgent ? undefined : unauthorized('AGENT_KEY_REQUIRED', 'This needs the phone agent key.'))
}
