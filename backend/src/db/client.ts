import { drizzle } from 'drizzle-orm/node-postgres'
import pg from 'pg'
import * as schema from './schema.js'

function createPool(): pg.Pool {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) throw new Error('DATABASE_URL is not set')
  const pool = new pg.Pool({ connectionString, max: 10 })
  // Without a listener, an error on an idle client would crash the process.
  pool.on('error', (error) => console.error('[db] idle client error:', error.message))
  return pool
}

export const pool = createPool()
export const db = drizzle(pool, { schema })

export type Database = typeof db
export type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0]

/** Retry until the database accepts connections (it may still be starting up). */
export async function waitForDatabase(timeoutMs = 60_000): Promise<void> {
  const deadline = Date.now() + timeoutMs
  for (;;) {
    try {
      await pool.query('select 1')
      return
    } catch (error) {
      if (Date.now() > deadline) throw error
      await new Promise((resolve) => setTimeout(resolve, 1000))
    }
  }
}
