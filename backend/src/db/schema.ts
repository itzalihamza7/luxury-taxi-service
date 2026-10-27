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
  /** Null when the price is agreed with the business (e.g. hourly hire of a vehicle without an hourly rate). */
  totalCents: number | null
  available: boolean
  /** Why the vehicle cannot be booked for this party, if it cannot. */
  reason?: 'passengers' | 'luggage'
}

export const USER_ROLES = ['customer', 'admin', 'superadmin'] as const
export type UserRole = (typeof USER_ROLES)[number]

const RIDE_TYPES = ['one_way', 'return', 'local', 'hourly', 'city_to_city', 'airport'] as const
const BOOKING_STATUSES = ['pending', 'confirmed', 'in_progress', 'completed', 'cancelled'] as const
const PAYMENT_METHODS = ['chauffeur', 'online'] as const
/** `partly_paid`: an advance has been received, the rest is still due. */
const PAYMENT_STATUSES = ['unpaid', 'partly_paid', 'paid'] as const
const ROUTE_SOURCES = ['road', 'estimate'] as const
/** Who entered a booking: the customer on the website, or an operator on their behalf (phone, WhatsApp). */
/** Where a booking came from: the website, the team (by phone), or the AI phone agent. */
const BOOKING_SOURCES = ['website', 'operator', 'agent'] as const

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
    /** `admin` runs the business; `superadmin` can also appoint and remove other super admins. */
    role: text('role', { enum: USER_ROLES })
      .notNull()
      .default('customer'),
    /** When the customer proved the address is theirs (a code by email, or a password reset). */
    emailVerifiedAt: timestamptz('email_verified_at'),
    createdAt: timestamptz('created_at').notNull().defaultNow(),
    updatedAt: timestamptz('updated_at').notNull().defaultNow(),
  },
  (table) => [check('users_role_check', sql`${table.role} in ('customer', 'admin', 'superadmin')`)],
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
    /** The fixed price of a transfer inside the M-30, and between the airport and the M-30. */
    zoneFareCents: integer('zone_fare_cents').notNull(),
    /** Added for each road kilometre beyond the M-30. */
    perKmCents: integer('per_km_cents').notNull(),
    /** Hourly hire; null when it is only offered at a price agreed case by case. */
    hourlyRateCents: integer('hourly_rate_cents'),
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
      sql`${table.zoneFareCents} >= 0 and ${table.perKmCents} >= 0 and (${table.hourlyRateCents} is null or ${table.hourlyRateCents} >= 0)`,
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

    /** Null until the business sets the price, when it is agreed with the customer. */
    totalCents: integer('total_cents'),
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
    /**
     * Opens the booking's page for a guest, with the reference. It is sent by email with the
     * booking and again with each payment request, so it is kept as it is (like the booking data
     * it protects), not hashed.
     */
    guestCode: text('guest_code'),

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
    check('bookings_payment_status_check', sql`${table.paymentStatus} in ('unpaid', 'partly_paid', 'paid')`),
    check('bookings_total_check', sql`${table.totalCents} >= 0`),
    check('bookings_source_check', sql`${table.source} in ('website', 'operator', 'agent')`),
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
/**
 * One-time links to choose a new password. Only a hash of the token is stored,
 * like session tokens, so a database leak does not hand out working links.
 */
export const passwordResets = pgTable(
  'password_resets',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull().unique(),
    expiresAt: timestamptz('expires_at').notNull(),
    usedAt: timestamptz('used_at'),
    createdAt: timestamptz('created_at').notNull().defaultNow(),
  },
  (table) => [index('password_resets_user_id_idx').on(table.userId)],
)

/**
 * Codes that prove a customer's email address is theirs. Only a hash is kept; a code expires
 * after a while and after a few wrong tries.
 */
export const emailVerifications = pgTable(
  'email_verifications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    /** The address the code was sent to: the account's email may change before it is used. */
    email: text('email').notNull(),
    codeHash: text('code_hash').notNull(),
    attempts: integer('attempts').notNull().default(0),
    expiresAt: timestamptz('expires_at').notNull(),
    usedAt: timestamptz('used_at'),
    createdAt: timestamptz('created_at').notNull().defaultNow(),
  },
  (table) => [index('email_verifications_user_id_idx').on(table.userId)],
)

export const BOOKING_EVENT_KINDS = ['created', 'edited', 'status_changed', 'payment_requested', 'payment_proof', 'payment_received', 'payment_cancelled'] as const
export type BookingEventKind = (typeof BOOKING_EVENT_KINDS)[number]
/** One field of a booking that changed: dates as ISO strings, prices in cents, everything else as shown; written out for the reader. */
export type BookingChange = { field: string; from: string | null; to: string | null }

/**
 * A booking's history: what changed, when, who did it and why. The team sees it in the console,
 * the customer on the booking's page.
 */
export const bookingEvents = pgTable(
  'booking_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    bookingId: uuid('booking_id')
      .notNull()
      .references(() => bookings.id, { onDelete: 'cascade' }),
    kind: text('kind', { enum: BOOKING_EVENT_KINDS }).notNull(),
    /** The team member who made the change; null for the customer or the website itself. */
    actorId: uuid('actor_id').references(() => users.id, { onDelete: 'set null' }),
    /** Their name at the time, so the history stays readable if the account is removed. */
    actorName: text('actor_name'),
    changes: jsonb('changes').$type<BookingChange[]>().notNull().default([]),
    /** Why: required when the team edits a booking. */
    note: text('note'),
    createdAt: timestamptz('created_at').notNull().defaultNow(),
  },
  (table) => [index('booking_events_booking_id_idx').on(table.bookingId)],
)

export const PAYMENT_REQUEST_KINDS = ['advance', 'full', 'balance'] as const
export const PAYMENT_REQUEST_STATUSES = ['requested', 'paid', 'cancelled'] as const

/**
 * A request to pay part or all of a booking, through a payment link the team creates with
 * their payment provider. The team marks it paid once the money has arrived.
 */
export const bookingPayments = pgTable(
  'booking_payments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    bookingId: uuid('booking_id')
      .notNull()
      .references(() => bookings.id, { onDelete: 'cascade' }),
    kind: text('kind', { enum: PAYMENT_REQUEST_KINDS }).notNull(),
    amountCents: integer('amount_cents').notNull(),
    currency: text('currency').notNull(),
    link: text('link').notNull(),
    status: text('status', { enum: PAYMENT_REQUEST_STATUSES }).notNull().default('requested'),
    requestedBy: uuid('requested_by').references(() => users.id, { onDelete: 'set null' }),
    requestedAt: timestamptz('requested_at').notNull().defaultNow(),
    /** When the customer last uploaded proof of this payment (the file is in `payment_proofs`). */
    proofUploadedAt: timestamptz('proof_uploaded_at'),
    paidAt: timestamptz('paid_at'),
  },
  (table) => [
    index('booking_payments_booking_id_idx').on(table.bookingId),
    check('booking_payments_amount_check', sql`${table.amountCents} > 0`),
    check('booking_payments_kind_check', sql`${table.kind} in ('advance', 'full', 'balance')`),
    check('booking_payments_status_check', sql`${table.status} in ('requested', 'paid', 'cancelled')`),
  ],
)

/**
 * The customer's proof of a payment: a screenshot or PDF of the confirmation, uploaded from the
 * booking's page with "Payment done". Only the team can open it; it checks it before marking the
 * payment received. Kept apart from `booking_payments` so listing payments never loads the files.
 */
export const paymentProofs = pgTable('payment_proofs', {
  paymentId: uuid('payment_id')
    .primaryKey()
    .references(() => bookingPayments.id, { onDelete: 'cascade' }),
  contentType: text('content_type').notNull(),
  size: integer('size').notNull(),
  data: bytea('data').notNull(),
  uploadedAt: timestamptz('uploaded_at').notNull().defaultNow(),
})

export const settings = pgTable('settings', {
  key: text('key').primaryKey(),
  value: jsonb('value').$type<Record<string, unknown>>().notNull(),
  updatedAt: timestamptz('updated_at').notNull().defaultNow(),
})

/**
 * Keys for the business's AI phone agent (e.g. Vesper). Requests with one are counted per key
 * instead of per IP, may use the agent-only endpoints, and their bookings are marked "agent".
 * Only a hash is stored; the key is shown once, when it is created.
 */
export const agentKeys = pgTable('agent_keys', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  /** SHA-256 of the key. */
  keyHash: text('key_hash').notNull().unique(),
  /** The key's first characters, so admins can tell keys apart. */
  prefix: text('prefix').notNull(),
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamptz('created_at').notNull().defaultNow(),
  lastUsedAt: timestamptz('last_used_at'),
  revokedAt: timestamptz('revoked_at'),
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
export type BookingEvent = typeof bookingEvents.$inferSelect
export type BookingPayment = typeof bookingPayments.$inferSelect
export type AgentKey = typeof agentKeys.$inferSelect
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
