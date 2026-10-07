import { fileURLToPath } from 'node:url'
import { count, eq } from 'drizzle-orm'
import { loadConfig } from '../config.js'
import { hashPassword } from '../lib/password.js'
import { contentSchemas } from '../modules/content/schemas.js'
import { db, pool } from './client.js'
import { startingContent } from './content/index.js'
import { DEFAULT_SITE_SETTINGS } from './content/settings.js'
import { INITIAL_FLEET } from './fleet.js'
import { CONTENT_COLLECTIONS, contentEntries, settings, users, vehicles } from './schema.js'

const SEEDED_KEY = 'seeded'

/**
 * Idempotent bootstrap data. Safe to run on every start:
 * it only fills what is missing and never overwrites existing rows.
 */
export async function seed(): Promise<void> {
  // What has been seeded is remembered, so that content the operator later
  // deletes in the console does not come back on the next start.
  const [marker] = await db.select().from(settings).where(eq(settings.key, SEEDED_KEY))
  const seeded = { ...(marker?.value as Record<string, boolean> | undefined) }

  if (!seeded.fleet) {
    const [fleet] = await db.select({ total: count() }).from(vehicles)
    if ((fleet?.total ?? 0) === 0) {
      await db.insert(vehicles).values(INITIAL_FLEET)
      console.log(`[seed] inserted ${INITIAL_FLEET.length} vehicles`)
    }
    seeded.fleet = true
  }

  const content = startingContent()
  for (const collection of CONTENT_COLLECTIONS) {
    if (seeded[collection]) continue
    const [existing] = await db.select({ total: count() }).from(contentEntries).where(eq(contentEntries.collection, collection))
    if ((existing?.total ?? 0) === 0 && content[collection].length > 0) {
      await db.insert(contentEntries).values(
        content[collection].map((entry) => ({
          collection,
          slug: entry.slug,
          sortOrder: entry.sortOrder,
          // Parsing rejects starting content that the console could not save.
          data: contentSchemas[collection].parse(entry.data) as Record<string, unknown>,
        })),
      )
      console.log(`[seed] inserted ${content[collection].length} ${collection} entries`)
    }
    seeded[collection] = true
  }

  await db.insert(settings).values({ key: 'site', value: DEFAULT_SITE_SETTINGS }).onConflictDoNothing()
  await db
    .insert(settings)
    .values({ key: SEEDED_KEY, value: seeded })
    .onConflictDoUpdate({ target: settings.key, set: { value: seeded, updatedAt: new Date() } })

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
