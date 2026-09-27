import { fileURLToPath } from 'node:url'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { db, pool, waitForDatabase } from './client.js'

// Works from both `src/db` (tsx) and `dist/db` (compiled): the folder sits at the package root.
export const migrationsFolder = fileURLToPath(new URL('../../drizzle', import.meta.url))

export async function runMigrations(): Promise<void> {
  await waitForDatabase()
  await migrate(db, { migrationsFolder })
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    await runMigrations()
    console.log('[db] migrations applied')
  } catch (error) {
    console.error('[db] migration failed:', error)
    process.exitCode = 1
  } finally {
    await pool.end()
  }
}
