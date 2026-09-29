const DEFAULT_URL = 'postgresql://db:db@db:5432/db'

/**
 * Tests run against a separate `<name>_test` database on the same server, so
 * they never touch development data. Set TEST_DATABASE_URL to override.
 */
export function testDatabaseUrl(): string {
  if (process.env.TEST_DATABASE_URL) return process.env.TEST_DATABASE_URL
  const url = new URL(process.env.DATABASE_URL ?? DEFAULT_URL)
  const name = url.pathname.replace(/^\//, '') || 'db'
  url.pathname = `/${name.endsWith('_test') ? name : `${name}_test`}`
  return url.toString()
}
