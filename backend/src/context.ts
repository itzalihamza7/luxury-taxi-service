import type { Config } from './config.js'
import type { RouteFinder } from './lib/geo.js'
import type { Mailer } from './lib/mailer.js'
import type { RateLimiterFactory } from './lib/rate-limit.js'
import type { PaymentGateway } from './modules/payments/paypal.js'

/** Dependencies shared by the route modules. Built once in `createApp`. */
export interface AppContext {
  config: Config
  rateLimit: RateLimiterFactory
  findRoute: RouteFinder
  payments: PaymentGateway
  mailer: Mailer
}
