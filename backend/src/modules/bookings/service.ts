import { and, desc, eq, isNull, or, type SQL } from 'drizzle-orm'
import type { Config } from '../../config.js'
import type { AppContext } from '../../context.js'
import { db } from '../../db/client.js'
import { bookings, quotes, vehicles, type Booking } from '../../db/schema.js'
import { badRequest, conflict, HttpError, notFound } from '../../lib/errors.js'
import { phoneMatches, samePhone } from '../../lib/phone.js'
import { generateReference } from '../../lib/reference.js'
import type { SessionUser } from '../auth/session.js'
import { PaymentError } from '../payments/paypal.js'
import { bookingCancelledEmail, bookingReceivedEmail } from './emails.js'
import { listEvents, listPayments, newGuestCode, recordEvent, sendQuietly, serializeEvent, serializePayment, type Actor } from './flow.js'

/** Statuses a customer may still cancel from. */
const CANCELLABLE: Booking['status'][] = ['pending', 'confirmed']

export function canCancel(booking: Booking, config: Config, now = Date.now()): boolean {
  return (
    CANCELLABLE.includes(booking.status) && booking.pickupAt.getTime() - now >= config.FREE_CANCEL_HOURS * 3_600_000
  )
}

/** The booking as shown to its owner (customer, guest with reference + email, or admin). */
export function serializeBooking(booking: Booking, config: Config) {
  return {
    reference: booking.reference,
    status: booking.status,
    rideType: booking.rideType,
    pickup: { label: booking.pickupLabel, lat: booking.pickupLat, lng: booking.pickupLng },
    dropoff:
      booking.dropoffLabel !== null && booking.dropoffLat !== null && booking.dropoffLng !== null
        ? { label: booking.dropoffLabel, lat: booking.dropoffLat, lng: booking.dropoffLng }
        : null,
    pickupAt: booking.pickupAt.toISOString(),
    returnAt: booking.returnAt?.toISOString() ?? null,
    hours: booking.hours,
    flightNumber: booking.flightNumber,
    adults: booking.adults,
    children: booking.children,
    luggage: booking.luggage,
    vehicleName: booking.vehicleName,
    route:
      booking.distanceM !== null && booking.durationS !== null
        ? { distanceM: booking.distanceM, durationS: booking.durationS, source: booking.routeSource }
        : null,
    totalCents: booking.totalCents,
    currency: booking.currency,
    paymentMethod: booking.paymentMethod,
    paymentStatus: booking.paymentStatus,
    contact: {
      name: booking.contactName,
      email: booking.contactEmail,
      phone: booking.contactPhone,
      company: booking.company,
      notes: booking.notes,
    },
    isGuest: booking.userId === null,
    /** `operator` when the business entered it for the customer (phone, WhatsApp). */
    source: booking.source,
    canCancel: canCancel(booking, config),
    createdAt: booking.createdAt.toISOString(),
  }
}

export type PublicBooking = ReturnType<typeof serializeBooking>

/** The booking with its history and payment requests, for its page (customer) or the console (team). */
export async function serializeBookingInFull(booking: Booking, config: Config) {
  const [events, payments] = await Promise.all([listEvents(booking.id), listPayments(booking.id)])
  return { ...serializeBooking(booking, config), events: events.map(serializeEvent), payments: payments.map(serializePayment) }
}

export interface CreateBookingInput {
  quoteId: string
  vehicleId: string
  /** A customer booking on the website gives both email and phone; an operator may have only one. */
  contact: { name: string; email: string | null; phone: string | null; company: string | null; notes: string | null }
  flightNumber: string | null
  paymentMethod: 'chauffeur' | 'online'
  locale: 'en' | 'es'
}

/** Set when an operator enters the booking for a customer. */
export interface OperatorOptions {
  /** The customer's account, when they have one and the booking should appear in it. */
  userId: string | null
  /** A price agreed with the customer, replacing the calculated one. */
  totalCents?: number | null
  /** The team member entering it, for the booking's history. */
  actor?: Actor
}

/** Postgres unique-violation details, whether thrown directly or wrapped by drizzle. */
function uniqueViolation(error: unknown): string | null {
  const candidate = ((error as { cause?: unknown }).cause ?? error) as { code?: unknown; constraint?: unknown }
  return candidate?.code === '23505' ? String(candidate.constraint ?? '') : null
}

export async function createBooking(
  { config, payments, mailer }: AppContext,
  input: CreateBookingInput,
  user: SessionUser | undefined,
  operator?: OperatorOptions,
  /** Booked by the AI phone agent (with its key). */
  byAgent = false,
): Promise<{ booking: Booking; approveUrl: string | null; created: boolean }> {
  const [quote] = await db.select().from(quotes).where(eq(quotes.id, input.quoteId))
  if (!quote) throw notFound('QUOTE_NOT_FOUND', 'This price is no longer available. Please request a new quote.')

  // Submitting the same quote twice (double click, retry) returns the original booking.
  const [existing] = await db.select().from(bookings).where(eq(bookings.quoteId, quote.id))
  if (existing) return { booking: existing, approveUrl: null, created: false }

  const now = Date.now()
  if (quote.expiresAt.getTime() < now) {
    throw new HttpError(410, 'QUOTE_EXPIRED', 'This price has expired. Please request a new quote.')
  }
  // The minimum notice is for customers; an operator may enter a ride that leaves right away.
  if (!operator && quote.pickupAt.getTime() - now < config.MIN_LEAD_MINUTES * 60_000) {
    throw conflict('LEAD_TIME', 'The pickup time is now too close. Please choose a later time.')
  }

  const option = quote.options.find((candidate) => candidate.vehicleId === input.vehicleId)
  if (!option?.available) throw badRequest('VEHICLE_UNAVAILABLE', 'This vehicle cannot be booked for this journey.')

  const [vehicle] = await db.select().from(vehicles).where(eq(vehicles.id, option.vehicleId))
  if (!vehicle?.active) throw badRequest('VEHICLE_UNAVAILABLE', 'This vehicle cannot be booked for this journey.')

  if (input.paymentMethod === 'online' && !payments.enabled) {
    throw badRequest('PAYMENTS_UNAVAILABLE', 'Online payment is not available. Please choose to pay your chauffeur.')
  }
  const totalCents = operator?.totalCents ?? option.totalCents
  if (input.paymentMethod === 'online' && totalCents === null) {
    throw badRequest('PRICE_ON_REQUEST', 'This ride is priced with you first: we will send you a payment link once the price is agreed.')
  }

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const reference = generateReference()

    // Create the payment order first: if PayPal fails, nothing has been stored yet.
    let payment: { orderId: string; approveUrl: string } | null = null
    if (input.paymentMethod === 'online') {
      const returnBase = `${config.APP_URL.replace(/\/+$/, '')}/${input.locale}/booking/payment?ref=${reference}`
      try {
        payment = await payments.createOrder({
          reference,
          amountCents: totalCents!,
          currency: quote.currency,
          description: `Chauffeur booking ${reference} - ${vehicle.name}`,
          returnUrl: returnBase,
          cancelUrl: `${returnBase}&cancelled=1`,
          locale: input.locale,
        })
      } catch (error) {
        if (error instanceof PaymentError) {
          console.error('[payments]', error.message)
          throw new HttpError(502, 'PAYMENT_PROVIDER_ERROR', 'We could not reach the payment provider. Please try again or pay your chauffeur.')
        }
        throw error
      }
    }

    try {
      const [booking] = await db
        .insert(bookings)
        .values({
          reference,
          userId: operator ? operator.userId : (user?.id ?? null),
          quoteId: quote.id,
          source: operator ? 'operator' : byAgent ? 'agent' : 'website',
          // An operator who enters a booking has already agreed it with the customer.
          status: operator ? 'confirmed' : 'pending',
          rideType: quote.rideType,
          pickupLabel: quote.pickup.label,
          pickupLat: quote.pickup.lat,
          pickupLng: quote.pickup.lng,
          dropoffLabel: quote.dropoff?.label ?? null,
          dropoffLat: quote.dropoff?.lat ?? null,
          dropoffLng: quote.dropoff?.lng ?? null,
          pickupAt: quote.pickupAt,
          returnAt: quote.returnAt,
          hours: quote.hours,
          flightNumber: input.flightNumber,
          adults: quote.adults,
          children: quote.children,
          luggage: quote.luggage,
          vehicleId: vehicle.id,
          vehicleName: vehicle.name,
          distanceM: quote.distanceM,
          durationS: quote.durationS,
          routeSource: quote.routeSource,
          totalCents,
          currency: quote.currency,
          paymentMethod: input.paymentMethod,
          paymentRef: payment?.orderId ?? null,
          contactName: input.contact.name,
          contactEmail: input.contact.email,
          contactPhone: input.contact.phone,
          company: input.contact.company,
          notes: input.contact.notes,
          locale: input.locale,
          guestCode: newGuestCode(),
        })
        .returning()
      if (!booking) throw new Error('booking insert returned no row')
      await recordEvent(booking.id, 'created', operator?.actor ?? null)
      sendQuietly(mailer, bookingReceivedEmail(booking, config))
      return { booking, approveUrl: payment?.approveUrl ?? null, created: true }
    } catch (error) {
      const constraint = uniqueViolation(error)
      if (constraint === null) throw error
      if (constraint.includes('quote_id')) {
        // A concurrent request booked this quote a moment ago.
        const [winner] = await db.select().from(bookings).where(eq(bookings.quoteId, quote.id))
        if (winner) return { booking: winner, approveUrl: null, created: false }
      }
      // Otherwise the random reference collided: try again with a new one.
    }
  }
  throw new Error('could not allocate a unique booking reference')
}

export async function findBookingByReference(reference: string): Promise<Booking | undefined> {
  const [booking] = await db.select().from(bookings).where(eq(bookings.reference, reference))
  return booking
}

export function listBookingsForUser(userId: string): Promise<Booking[]> {
  return db.select().from(bookings).where(eq(bookings.userId, userId)).orderBy(desc(bookings.pickupAt))
}

/** Cancels a booking, records who did it and why, and tells the customer by email. */
export async function cancelBooking({ config, mailer }: Pick<AppContext, 'config' | 'mailer'>, booking: Booking, actor: Actor = null, note: string | null = null): Promise<Booking> {
  const now = new Date()
  const [updated] = await db
    .update(bookings)
    .set({ status: 'cancelled', cancelledAt: now, updatedAt: now })
    .where(eq(bookings.id, booking.id))
    .returning()
  if (!updated) throw notFound('BOOKING_NOT_FOUND', 'Booking not found.')
  await recordEvent(booking.id, 'status_changed', actor, [{ field: 'status', from: booking.status, to: 'cancelled' }], note)
  sendQuietly(mailer, bookingCancelledEmail(updated, note, config))
  return updated
}

/** Whether a guest proved the booking is theirs: by its email, or by its phone number. */
export function contactMatches(booking: Booking, contact: { email?: string; phone?: string }): boolean {
  if (contact.email && booking.contactEmail === contact.email) return true
  return samePhone(booking.contactPhone, contact.phone)
}

/**
 * Give an account the bookings an operator took for its email address or phone
 * number while the customer had no account. Returns how many were added.
 *
 * Neither the email nor the phone number of a new account is verified, so this
 * trusts whoever signs up with them. It can be switched off in the console
 * (Business details).
 */
export async function claimOperatorBookings(user: Pick<SessionUser, 'id' | 'email' | 'phone'>): Promise<number> {
  const mine: SQL[] = [eq(bookings.contactEmail, user.email)]
  if (user.phone) mine.push(phoneMatches(bookings.contactPhone, user.phone))
  const claimed = await db
    .update(bookings)
    .set({ userId: user.id, updatedAt: new Date() })
    .where(and(isNull(bookings.userId), eq(bookings.source, 'operator'), or(...mine)))
    .returning({ id: bookings.id })
  return claimed.length
}
