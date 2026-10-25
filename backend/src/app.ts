import express, { type Express } from 'express'
import { LIMITS, type Config } from './config.js'
import type { AppContext } from './context.js'
import { pool } from './db/client.js'
import { errorHandler, notFoundHandler } from './lib/errors.js'
import { createRouteFinder } from './lib/geo.js'
import { createMailer } from './lib/mailer.js'
import { createRateLimiter } from './lib/rate-limit.js'
import { adminRouter } from './modules/admin/routes.js'
import { analyticsRouter } from './modules/analytics/routes.js'
import { authRouter } from './modules/auth/routes.js'
import { passwordResetRouter } from './modules/auth/password-reset.js'
import { attachUser } from './modules/auth/session.js'
import { bookingsRouter } from './modules/bookings/routes.js'
import { contactRouter } from './modules/contact/routes.js'
import { contentRouter } from './modules/content/routes.js'
import { mediaRouter } from './modules/media/routes.js'
import { createPayPalGateway } from './modules/payments/paypal.js'
import { paymentsRouter } from './modules/payments/routes.js'
import { attachPhoneAgent } from './modules/phone-agent/keys.js'
import { phoneAgentRouter } from './modules/phone-agent/routes.js'
import { knownRoutesFromMadrid } from './modules/places/catalog.js'
import { placesRouter } from './modules/places/routes.js'
import { quotesRouter } from './modules/quotes/routes.js'
import { vehiclesRouter } from './modules/vehicles/routes.js'

/** `overrides` replaces dependencies, e.g. the mailer in tests. */
export function createApp(config: Config, overrides: Partial<Pick<AppContext, 'mailer'>> = {}): Express {
  const context: AppContext = {
    config,
    rateLimit: createRateLimiter(config.RATE_LIMIT_DISABLED),
    findRoute: createRouteFinder(config.ROUTER_URL, knownRoutesFromMadrid()),
    payments: createPayPalGateway(config),
    mailer: overrides.mailer ?? createMailer(config),
  }

  const app = express()
  app.disable('x-powered-by')
  // Needed for correct client IPs and for `req.secure` behind the frontend / a load balancer.
  app.set('trust proxy', config.TRUST_PROXY)

  if (config.NODE_ENV !== 'test') {
    app.use((req, res, next) => {
      const started = performance.now()
      res.on('finish', () => {
        if (req.path === '/api/health') return
        console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${Math.round(performance.now() - started)}ms`)
      })
      next()
    })
  }

  app.get('/api/health', async (_req, res) => {
    try {
      await pool.query('select 1')
      res.json({ status: 'ok' })
    } catch {
      res.status(503).json({ status: 'unavailable' })
    }
  })

  // The API only ever exchanges JSON. A cross-site HTML form cannot send it, and
  // the session cookie is SameSite=Lax, which together rule out CSRF.
  // Console requests carry whole articles and legal texts, so they get a larger limit.
  app.use('/api/admin', express.json({ limit: '1mb' }))
  app.use(express.json({ limit: '50kb' }))
  app.use(attachUser)
  app.use(attachPhoneAgent)

  /** Business settings the booking screens need. Contains nothing secret. */
  app.get('/api/config', (_req, res) => {
    res.json({
      currency: config.CURRENCY,
      timeZone: config.BUSINESS_TIMEZONE,
      minLeadMinutes: config.MIN_LEAD_MINUTES,
      freeCancelHours: config.FREE_CANCEL_HOURS,
      quoteTtlMinutes: config.QUOTE_TTL_MINUTES,
      onlinePayments: context.payments.enabled,
      limits: LIMITS,
    })
  })

  app.use('/api/auth', authRouter(context))
  app.use('/api/auth', passwordResetRouter(context))
  app.use('/api/vehicles', vehiclesRouter())
  app.use('/api/places', placesRouter(context))
  app.use('/api/quotes', quotesRouter(context))
  app.use('/api/bookings', bookingsRouter(context))
  app.use('/api/payments', paymentsRouter(context))
  app.use('/api/track', analyticsRouter(context))
  app.use('/api/content', contentRouter())
  app.use('/api/media', mediaRouter())
  app.use('/api/agent', phoneAgentRouter(context))
  app.use('/api/admin', adminRouter(context))
  app.use('/api', contactRouter(context))

  app.use(notFoundHandler)
  app.use(errorHandler)
  return app
}
