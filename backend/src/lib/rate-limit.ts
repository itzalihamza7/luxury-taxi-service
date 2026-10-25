import type { RequestHandler } from 'express'
import { HttpError } from './errors.js'

interface Bucket {
  count: number
  resetAt: number
}

export interface RateLimitOptions {
  /** Distinguishes limiters so they do not share counters. */
  name: string
  windowMs: number
  limit: number
}

export type RateLimiterFactory = (options: RateLimitOptions) => RequestHandler

/** How many more requests an agent key gets than one visitor. */
export const AGENT_LIMIT_FACTOR = 20

/**
 * Fixed-window, in-memory rate limiting per client IP. Requests with the AI phone agent's key are
 * counted per key instead, with a higher limit: one key serves many callers at once.
 *
 * State lives in this process, which fits a single API instance. If you scale
 * the API horizontally, enforce limits at the reverse proxy instead.
 */
export function createRateLimiter(disabled: boolean): RateLimiterFactory {
  if (disabled) return () => (_req, _res, next) => next()

  const buckets = new Map<string, Bucket>()
  const sweep = setInterval(() => {
    const now = Date.now()
    for (const [key, bucket] of buckets) {
      if (bucket.resetAt <= now) buckets.delete(key)
    }
  }, 60_000)
  sweep.unref()

  return ({ name, windowMs, limit }) =>
    (req, res, next) => {
      const now = Date.now()
      const agent = req.phoneAgent
      const key = agent ? `${name}:agent:${agent.id}` : `${name}:${req.ip ?? 'unknown'}`
      const allowed = agent ? limit * AGENT_LIMIT_FACTOR : limit
      let bucket = buckets.get(key)
      if (!bucket || bucket.resetAt <= now) {
        bucket = { count: 0, resetAt: now + windowMs }
        buckets.set(key, bucket)
      }
      bucket.count += 1

      if (bucket.count > allowed) {
        res.setHeader('Retry-After', Math.ceil((bucket.resetAt - now) / 1000))
        next(new HttpError(429, 'RATE_LIMITED', 'Too many requests. Please wait a moment and try again.'))
        return
      }
      next()
    }
}
