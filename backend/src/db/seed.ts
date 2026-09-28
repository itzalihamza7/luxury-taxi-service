import { fileURLToPath } from 'node:url'
import { count, eq } from 'drizzle-orm'
import { loadConfig } from '../config.js'
import { hashPassword } from '../lib/password.js'
import { db, pool } from './client.js'
import { INITIAL_FLEET } from './fleet.js'
import { users, vehicles } from './schema.js'

/**
 * Idempotent bootstrap data. Safe to run on every start:
 * it only fills what is missing and never overwrites existing rows.
 */
export async function seed(): Promise<void> {
  const [fleet] = await db.select({ total: count() }).from(vehicles)
  if ((fleet?.total ?? 0) === 0) {
    await db.insert(vehicles).values(INITIAL_FLEET)
    console.log(`[seed] inserted ${INITIAL_FLEET.length} vehicles`)
  }

  const { ADMIN_EMAIL, ADMIN_PASSWORD } = loadConfig()
  if (ADMIN_EMAIL && ADMIN_PASSWORD) {
    const email = ADMIN_EMAIL.trim().toLowerCase()
    const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email))
    if (!existing) {
      await db.insert(users).values({
        email,
        name: 'Operations',
        role: 'admin',
        passwordHash: await hashPassword(ADMIN_PASSWORD),
      })
      console.log(`[seed] created admin account ${email}`)
    }
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    await seed()
    console.log('[seed] done')
  } catch (error) {
    console.error('[seed] failed:', error)
    process.exitCode = 1
  } finally {
    await pool.end()
  }
}
