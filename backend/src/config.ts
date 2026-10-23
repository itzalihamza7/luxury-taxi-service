import { z } from 'zod'

/** Treat empty strings (e.g. `FOO=` in an env file) as "not set". */
const optionalString = z.preprocess((value) => (value === '' ? undefined : value), z.string().optional())

const flag = z.preprocess((value) => value === true || value === 'true' || value === '1', z.boolean())

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  HOST: z.string().default('0.0.0.0'),
  DATABASE_URL: z.string().min(1),

  /** Public URL of the website. Used to build payment return links. */
  APP_URL: z.string().default('http://localhost:3000'),
  /** How many reverse proxies sit in front of the API (the Next.js frontend counts as one). */
  TRUST_PROXY: z.coerce.number().int().min(0).default(1),

  SESSION_TTL_DAYS: z.coerce.number().int().positive().default(30),
  RATE_LIMIT_DISABLED: flag.default(false),

  /** Business rules. */
  BUSINESS_TIMEZONE: z.string().default('Europe/Madrid'),
  CURRENCY: z.string().length(3).default('EUR'),
  MIN_LEAD_MINUTES: z.coerce.number().int().min(0).default(120),
  FREE_CANCEL_HOURS: z.coerce.number().int().min(0).default(24),
  QUOTE_TTL_MINUTES: z.coerce.number().int().positive().default(30),

  /** Photon-compatible geocoder for address search. Empty string disables it. */
  GEOCODER_URL: z.string().default('https://photon.komoot.io'),
  /** OSRM-compatible routing server for road distances. Empty = built-in estimate. */
  ROUTER_URL: z.string().default(''),

  /** PayPal Checkout. Online payment is offered only when both credentials are set. */
  PAYPAL_CLIENT_ID: optionalString,
  PAYPAL_CLIENT_SECRET: optionalString,
  PAYPAL_API_BASE: z.string().default('https://api-m.sandbox.paypal.com'),

  /** City-level IP geolocation database (MMDB, e.g. DB-IP Lite). Without it, clicks have no location. */
  GEOIP_DB: optionalString,

  /** Optional operator account created on startup if it does not exist yet. */
  ADMIN_EMAIL: optionalString,
  ADMIN_PASSWORD: optionalString,
})

export type Config = z.infer<typeof schema>

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const parsed = schema.safeParse(env)
  if (!parsed.success) {
    const details = parsed.error.issues.map((issue) => `  ${issue.path.join('.')}: ${issue.message}`).join('\n')
    throw new Error(`Invalid environment configuration:\n${details}`)
  }
  return parsed.data
}

/** Booking references look like `LX-7K3M9Q`. */
export const REFERENCE_PREFIX = 'LX'

/** Service area: mainland Spain and the Balearics. Requests outside it are rejected. */
export const SERVICE_AREA = { minLat: 35.8, maxLat: 43.9, minLng: -9.6, maxLng: 4.4 } as const

/** Search results are biased towards the home city. */
export const HOME_LOCATION = { lat: 40.4168, lng: -3.7038 } as const

export const LIMITS = {
  maxPassengers: 16,
  maxLuggage: 16,
  minHours: 2,
  maxHours: 12,
  maxAdvanceDays: 365,
  maxDistanceKm: 1500,
} as const
