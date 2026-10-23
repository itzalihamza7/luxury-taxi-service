import { sql } from 'drizzle-orm'
import {
  boolean,
  check,
  customType,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'

// NOTE: keep this file free of relative imports - drizzle-kit loads it directly.

export type Localized = { en: string; es: string }
export type LocalizedList = { en: string[]; es: string[] }

export type QuotePlace = { label: string; lat: number; lng: number }
export type QuoteOption = {
  vehicleId: string
  totalCents: number
  available: boolean
  /** Why the vehicle cannot be booked for this party, if it cannot. */
  reason?: 'passengers' | 'luggage'
}

const RIDE_TYPES = ['one_way', 'return', 'local', 'hourly', 'city_to_city', 'airport'] as const
const BOOKING_STATUSES = ['pending', 'confirmed', 'in_progress', 'completed', 'cancelled'] as const
const PAYMENT_METHODS = ['chauffeur', 'online'] as const
const PAYMENT_STATUSES = ['unpaid', 'paid'] as const
const ROUTE_SOURCES = ['road', 'estimate'] as const
/** Who entered a booking: the customer on the website, or an operator on their behalf (phone, WhatsApp). */
const BOOKING_SOURCES = ['website', 'operator'] as const

/** The kinds of editable content. Each has its own shape for `data` (see `modules/content/schemas.ts`). */
export const CONTENT_COLLECTIONS = ['service', 'route', 'event', 'article', 'faq', 'review', 'legal'] as const
export type ContentCollection = (typeof CONTENT_COLLECTIONS)[number]

const timestamptz = (name: string) => timestamp(name, { withTimezone: true })
const bytea = customType<{ data: Buffer }>({ dataType: () => 'bytea' })

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    /** Always stored lower-cased. */
    email: text('email').notNull().unique(),
    passwordHash: text('password_hash').notNull(),
    name: text('name').notNull(),
    phone: text('phone'),
    role: text('role', { enum: ['customer', 'admin'] })
      .notNull()
      .default('customer'),
    createdAt: timestamptz('created_at').notNull().defaultNow(),
    updatedAt: timestamptz('updated_at').notNull().defaultNow(),
  },
  (table) => [check('users_role_check', sql`${table.role} in ('customer', 'admin')`)],
)

export const sessions = pgTable(
  'sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    /** SHA-256 of the cookie value; the raw token is never stored. */
    tokenHash: text('token_hash').notNull().unique(),
    expiresAt: timestamptz('expires_at').notNull(),
    createdAt: timestamptz('created_at').notNull().defaultNow(),
  },
  (table) => [index('sessions_user_id_idx').on(table.userId)],
)

export const vehicles = pgTable(
  'vehicles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    slug: text('slug').notNull().unique(),
    name: text('name').notNull(),
    category: text('category', { enum: ['economy', 'sedan', 'van', 'group', 'flagship'] }).notNull(),
    /** Selects the illustration shown for the vehicle. */
    bodyType: text('body_type', { enum: ['hatchback', 'sedan', 'limousine', 'van', 'minibus'] }).notNull(),
    passengers: integer('passengers').notNull(),
    luggage: integer('luggage').notNull(),
    baseFareCents: integer('base_fare_cents').notNull(),
    perKmCents: integer('per_km_cents').notNull(),
    hourlyRateCents: integer('hourly_rate_cents').notNull(),
    minFareCents: integer('min_fare_cents').notNull(),
    tagline: jsonb('tagline').$type<Localized>().notNull(),
    description: jsonb('description').$type<Localized>().notNull(),
    highlights: jsonb('highlights').$type<LocalizedList>().notNull(),
    /** Optional photo (e.g. `/images/fleet/s-class.jpg`). Falls back to the illustration. */
    imageUrl: text('image_url'),
    sortOrder: integer('sort_order').notNull().default(0),
    active: boolean('active').notNull().default(true),
    createdAt: timestamptz('created_at').notNull().defaultNow(),
  },
  (table) => [
    check('vehicles_capacity_check', sql`${table.passengers} > 0 and ${table.luggage} >= 0`),
    check(
      'vehicles_rates_check',
      sql`${table.baseFareCents} >= 0 and ${table.perKmCents} >= 0 and ${table.hourlyRateCents} >= 0 and ${table.minFareCents} >= 0`,
    ),
  ],
)

/** A priced offer. A booking is always created from a quote, never from client-supplied prices. */
export const quotes = pgTable('quotes', {
  id: uuid('id').primaryKey().defaultRandom(),
  rideType: text('ride_type', { enum: RIDE_TYPES }).notNull(),
  pickup: jsonb('pickup').$type<QuotePlace>().notNull(),
  dropoff: jsonb('dropoff').$type<QuotePlace>(),
  pickupAt: timestamptz('pickup_at').notNull(),
  returnAt: timestamptz('return_at'),
  hours: integer('hours'),
  adults: integer('adults').notNull(),
  children: integer('children').notNull(),
  luggage: integer('luggage').notNull(),
  distanceM: integer('distance_m'),
  durationS: integer('duration_s'),
  routeSource: text('route_source', { enum: ROUTE_SOURCES }),
  options: jsonb('options').$type<QuoteOption[]>().notNull(),
  currency: text('currency').notNull(),
  expiresAt: timestamptz('expires_at').notNull(),
  createdAt: timestamptz('created_at').notNull().defaultNow(),
})

export const bookings = pgTable(
  'bookings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    reference: text('reference').notNull().unique(),
    /** Null for guest bookings. */
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    /** Unique: submitting the same quote twice returns the first booking instead of duplicating it. */
    quoteId: uuid('quote_id')
      .unique()
      .references(() => quotes.id, { onDelete: 'set null' }),
    source: text('source', { enum: BOOKING_SOURCES }).notNull().default('website'),
    status: text('status', { enum: BOOKING_STATUSES }).notNull().default('pending'),
    rideType: text('ride_type', { enum: RIDE_TYPES }).notNull(),

    pickupLabel: text('pickup_label').notNull(),
    pickupLat: doublePrecision('pickup_lat').notNull(),
    pickupLng: doublePrecision('pickup_lng').notNull(),
    dropoffLabel: text('dropoff_label'),
    dropoffLat: doublePrecision('dropoff_lat'),
    dropoffLng: doublePrecision('dropoff_lng'),

    pickupAt: timestamptz('pickup_at').notNull(),
    returnAt: timestamptz('return_at'),
    hours: integer('hours'),
    flightNumber: text('flight_number'),

    adults: integer('adults').notNull(),
    children: integer('children').notNull(),
    luggage: integer('luggage').notNull(),

    vehicleId: uuid('vehicle_id')
      .notNull()
      .references(() => vehicles.id, { onDelete: 'restrict' }),
    /** Snapshot, so history stays readable if the fleet changes. */
    vehicleName: text('vehicle_name').notNull(),

    distanceM: integer('distance_m'),
    durationS: integer('duration_s'),
    routeSource: text('route_source', { enum: ROUTE_SOURCES }),

    totalCents: integer('total_cents').notNull(),
    currency: text('currency').notNull(),
    paymentMethod: text('payment_method', { enum: PAYMENT_METHODS }).notNull(),
    paymentStatus: text('payment_status', { enum: PAYMENT_STATUSES }).notNull().default('unpaid'),
    /** Payment provider order id, when paying online. */
    paymentRef: text('payment_ref'),
    paidAt: timestamptz('paid_at'),

    contactName: text('contact_name').notNull(),
    /**
     * Website bookings have both. A booking taken by an operator may have only
     * one of them: whichever the customer gave. The email is stored lower-cased.
     */
    contactEmail: text('contact_email'),
    contactPhone: text('contact_phone'),
    company: text('company'),
    notes: text('notes'),
    locale: text('locale').notNull().default('en'),

    createdAt: timestamptz('created_at').notNull().defaultNow(),
    updatedAt: timestamptz('updated_at').notNull().defaultNow(),
    cancelledAt: timestamptz('cancelled_at'),
  },
  (table) => [
    index('bookings_user_id_idx').on(table.userId),
    index('bookings_contact_email_idx').on(table.contactEmail),
    index('bookings_pickup_at_idx').on(table.pickupAt),
    index('bookings_status_idx').on(table.status),
    index('bookings_payment_ref_idx').on(table.paymentRef),
    check(
      'bookings_status_check',
      sql`${table.status} in ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled')`,
    ),
    check('bookings_payment_method_check', sql`${table.paymentMethod} in ('chauffeur', 'online')`),
    check('bookings_payment_status_check', sql`${table.paymentStatus} in ('unpaid', 'paid')`),
    check('bookings_total_check', sql`${table.totalCents} >= 0`),
    check('bookings_source_check', sql`${table.source} in ('website', 'operator')`),
    check('bookings_contact_check', sql`${table.contactEmail} is not null or ${table.contactPhone} is not null`),
  ],
)

export const contactMessages = pgTable('contact_messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  phone: text('phone'),
  subject: text('subject').notNull(),
  message: text('message').notNull(),
  locale: text('locale').notNull().default('en'),
  createdAt: timestamptz('created_at').notNull().defaultNow(),
})

export const newsletterSubscribers = pgTable('newsletter_subscribers', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  locale: text('locale').notNull().default('en'),
  createdAt: timestamptz('created_at').notNull().defaultNow(),
})

/**
 * Editable website content: services, routes, events, journal articles, FAQs,
 * reviews and legal texts. `data` holds the fields of that kind of entry.
 */
export const contentEntries = pgTable(
  'content_entries',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    collection: text('collection', { enum: CONTENT_COLLECTIONS }).notNull(),
    /** Last part of the page address; unique within a collection. */
    slug: text('slug').notNull(),
    sortOrder: integer('sort_order').notNull().default(0),
    /** Unpublished entries are kept but not shown on the website. */
    published: boolean('published').notNull().default(true),
    data: jsonb('data').$type<Record<string, unknown>>().notNull(),
    createdAt: timestamptz('created_at').notNull().defaultNow(),
    updatedAt: timestamptz('updated_at').notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('content_entries_collection_slug_idx').on(table.collection, table.slug),
    check('content_entries_collection_check', sql`${table.collection} in ('service', 'route', 'event', 'article', 'faq', 'review', 'legal')`),
  ],
)

/** Named settings, e.g. `site` for the business details shown on the website. */
export const settings = pgTable('settings', {
  key: text('key').primaryKey(),
  value: jsonb('value').$type<Record<string, unknown>>().notNull(),
  updatedAt: timestamptz('updated_at').notNull().defaultNow(),
})

/** Images uploaded in the operations console. Served at `/api/media/:id`. */
export const media = pgTable('media', {
  id: uuid('id').primaryKey().defaultRandom(),
  contentType: text('content_type').notNull(),
  size: integer('size').notNull(),
  data: bytea('data').notNull(),
  createdAt: timestamptz('created_at').notNull().defaultNow(),
})

export type User = typeof users.$inferSelect
export type Vehicle = typeof vehicles.$inferSelect
export type Quote = typeof quotes.$inferSelect
export type Booking = typeof bookings.$inferSelect
export type ContentEntry = typeof contentEntries.$inferSelect
export type BookingStatus = (typeof BOOKING_STATUSES)[number]
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number]

const DEVICE_TYPES = ['mobile', 'tablet', 'desktop'] as const

/**
 * One click on a WhatsApp link of the website. The visitor's IP address is never
 * stored: only an approximate place looked up from it, and a hash that changes
 * every day (see `modules/analytics`).
 */
export const whatsappClicks = pgTable(
  'whatsapp_clicks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    createdAt: timestamptz('created_at').notNull().defaultNow(),
    /** Same value for the same browser on the same day, unrelated the next day. */
    visitor: text('visitor').notNull(),
    /** The visitor's first WhatsApp click that day. */
    isNew: boolean('is_new').notNull(),
    page: text('page').notNull(),
    referrer: text('referrer'),
    language: text('language'),
    countryCode: text('country_code'),
    country: text('country'),
    region: text('region'),
    city: text('city'),
    deviceType: text('device_type', { enum: DEVICE_TYPES }).notNull(),
    os: text('os'),
    browser: text('browser'),
  },
  (table) => [index('whatsapp_clicks_created_at_idx').on(table.createdAt), index('whatsapp_clicks_visitor_idx').on(table.visitor)],
)

export type WhatsappClick = typeof whatsappClicks.$inferSelect
