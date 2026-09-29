import { defineConfig } from 'vitest/config'
import { testDatabaseUrl } from './src/test/database-url.ts'

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    globalSetup: './src/test/global-setup.ts',
    // The suites share one database, so run them one file at a time.
    fileParallelism: false,
    testTimeout: 20_000,
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: testDatabaseUrl(),
      RATE_LIMIT_DISABLED: 'true',
      // Tests must not depend on third-party services.
      GEOCODER_URL: '',
      ROUTER_URL: '',
      PAYPAL_CLIENT_ID: '',
      PAYPAL_CLIENT_SECRET: '',
      ADMIN_EMAIL: '',
      ADMIN_PASSWORD: '',
    },
  },
})
