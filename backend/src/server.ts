import { createApp } from './app.js'
import { loadConfig } from './config.js'
import { pool, waitForDatabase } from './db/client.js'

const config = loadConfig()
await waitForDatabase()

const app = createApp(config)
const server = app.listen(config.PORT, config.HOST, () => {
  console.log(`[api] listening on http://${config.HOST}:${config.PORT} (${config.NODE_ENV})`)
})

function shutdown(signal: string): void {
  console.log(`[api] ${signal} received, shutting down`)
  server.close(() => {
    void pool.end().finally(() => process.exit(0))
  })
  // Do not hang forever on a stuck connection.
  setTimeout(() => process.exit(1), 10_000).unref()
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))
