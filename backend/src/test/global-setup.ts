import { fileURLToPath } from 'node:url'
import { drizzle } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import pg from 'pg'
import { testDatabaseUrl } from './database-url.js'

/** Create the test database if needed and bring its schema up to date. Runs once per test run. */
export default async function setup(): Promise<void> {
  const target = new URL(testDatabaseUrl())
  const name = target.pathname.replace(/^\//, '')
  if (!/^[a-z0-9_]+$/i.test(name)) throw new Error(`Refusing to use test database name "${name}"`)

  // Connect to the default maintenance database to create the test database.
  const maintenance = new URL(target)
  maintenance.pathname = '/postgres'
  const admin = new pg.Client({ connectionString: maintenance.toString() })
  await admin.connect()
  try {
    const existing = await admin.query('select 1 from pg_database where datname = $1', [name])
    if (existing.rowCount === 0) await admin.query(`create database "${name}"`)
  } finally {
    await admin.end()
  }

  const pool = new pg.Pool({ connectionString: target.toString(), max: 1 })
  try {
    await migrate(drizzle(pool), { migrationsFolder: fileURLToPath(new URL('../../drizzle', import.meta.url)) })
  } finally {
    await pool.end()
  }
}
