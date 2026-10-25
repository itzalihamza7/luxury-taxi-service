import { desc, eq } from 'drizzle-orm'
import { Router } from 'express'
import { z } from 'zod'
import { db } from '../../db/client.js'
import { agentKeys, type AgentKey } from '../../db/schema.js'
import { isUuid, parse } from '../../lib/validate.js'
import { notFound } from '../../lib/errors.js'
import { newAgentKey } from './keys.js'

const createSchema = z.object({ name: z.string().trim().min(1).max(80) })

const serialize = (key: AgentKey) => ({
  id: key.id,
  name: key.name,
  prefix: key.prefix,
  createdAt: key.createdAt.toISOString(),
  lastUsedAt: key.lastUsedAt?.toISOString() ?? null,
  revokedAt: key.revokedAt?.toISOString() ?? null,
})

/** Staff create and revoke the AI phone agent's keys (mounted under the admin router). */
export function agentKeysAdminRouter(): Router {
  const router = Router()

  router.get('/agent-keys', async (_req, res) => {
    const rows = await db.select().from(agentKeys).orderBy(desc(agentKeys.createdAt))
    res.json({ keys: rows.map(serialize) })
  })

  /** The key itself is in this response only. */
  router.post('/agent-keys', async (req, res) => {
    const input = parse(createSchema, req.body)
    const { key, keyHash, prefix } = newAgentKey()
    const [row] = await db.insert(agentKeys).values({ name: input.name, keyHash, prefix, createdBy: req.user!.id }).returning()
    res.status(201).json({ key, agentKey: serialize(row!) })
  })

  router.delete('/agent-keys/:id', async (req, res) => {
    const id = String(req.params.id)
    const [row] = isUuid(id)
      ? await db.update(agentKeys).set({ revokedAt: new Date() }).where(eq(agentKeys.id, id)).returning()
      : []
    if (!row) throw notFound('AGENT_KEY_NOT_FOUND', 'This key no longer exists.')
    res.json({ agentKey: serialize(row) })
  })

  return router
}
