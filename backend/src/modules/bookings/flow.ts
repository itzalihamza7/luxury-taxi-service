import { randomInt, timingSafeEqual } from 'node:crypto'
import { and, asc, desc, eq, isNull } from 'drizzle-orm'
import type { Config } from '../../config.js'
import { db } from '../../db/client.js'
import { bookingEvents, bookingPayments, bookings, type Booking, type BookingChange, type BookingEvent, type BookingEventKind, type BookingPayment } from '../../db/schema.js'
import type { Email, Mailer } from '../../lib/mailer.js'
import { phoneDigits } from '../../lib/phone.js'
import { bookingUrl, formatMoney, formatWhen } from './emails.js'

/*
 * What happens to a booking after it is made: its history, the payments the team asks for, the
 * guest code that opens its page, and the emails and WhatsApp messages that go with each step.
 */

// --- Guest codes -------------------------------------------------------------

/** No 0/O or 1/I, so a code is easy to read in an email and type back in. */
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

/** "K7QM-2XP9": 40 bits, far beyond guessing within the rate limits. */
export function newGuestCode(): string {
  let code = ''
  for (let index = 0; index < 8; index += 1) code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]
  return `${code.slice(0, 4)}-${code.slice(4)}`
}

const normalizeCode = (input: string) => input.toUpperCase().replace(/[^A-Z0-9]/g, '')

/** Whether `code` opens `booking`: any case, with or without the dash. */
export function guestCodeMatches(booking: Pick<Booking, 'guestCode'>, code: string | undefined): boolean {
  if (!booking.guestCode || !code) return false
  const expected = Buffer.from(normalizeCode(booking.guestCode))
  const given = Buffer.from(normalizeCode(code))
  return expected.length === given.length && timingSafeEqual(expected, given)
}

// --- History -----------------------------------------------------------------

/** The team member who made a change; null for the customer or the website itself. */
export type Actor = { id: string; name: string } | null

export async function recordEvent(bookingId: string, kind: BookingEventKind, actor: Actor, changes: BookingChange[] = [], note: string | null = null): Promise<void> {
  await db.insert(bookingEvents).values({ bookingId, kind, actorId: actor?.id ?? null, actorName: actor?.name ?? null, changes, note })
}

export function listEvents(bookingId: string): Promise<BookingEvent[]> {
  return db.select().from(bookingEvents).where(eq(bookingEvents.bookingId, bookingId)).orderBy(desc(bookingEvents.createdAt))
}

export function listPayments(bookingId: string): Promise<BookingPayment[]> {
  return db.select().from(bookingPayments).where(eq(bookingPayments.bookingId, bookingId)).orderBy(asc(bookingPayments.requestedAt))
}

export function serializeEvent(event: BookingEvent) {
  return {
    id: event.id,
    kind: event.kind,
    actorName: event.actorName,
    changes: event.changes,
    note: event.note,
    createdAt: event.createdAt.toISOString(),
  }
}

export function serializePayment(payment: BookingPayment) {
  return {
    id: payment.id,
    kind: payment.kind,
    amountCents: payment.amountCents,
    currency: payment.currency,
    /** Only while it can still be paid: a paid or withdrawn link is no use to the customer. */
    link: payment.status === 'requested' ? payment.link : null,
    status: payment.status,
    requestedAt: payment.requestedAt.toISOString(),
    paidAt: payment.paidAt?.toISOString() ?? null,
  }
}

/** The booking's payment status from what has been received: nothing, part (an advance) or all of it. */
export function paymentStatusFor(booking: Pick<Booking, 'totalCents'>, payments: Pick<BookingPayment, 'status' | 'amountCents' | 'kind'>[]): Booking['paymentStatus'] {
  const paid = payments.filter((payment) => payment.status === 'paid')
  if (paid.length === 0) return 'unpaid'
  const received = paid.reduce((sum, payment) => sum + payment.amountCents, 0)
  const settled = booking.totalCents === null ? paid.some((payment) => payment.kind !== 'advance') : received >= booking.totalCents
  return settled ? 'paid' : 'partly_paid'
}

// --- Messages ----------------------------------------------------------------

/** Sends an email without holding up the request: a failure is logged, never shown to the customer. */
export function sendQuietly(mailer: Mailer, email: Email): void {
  if (!email.to) return
  mailer.send(email).catch((error: unknown) => {
    console.error(`[bookings] could not send "${email.subject}":`, error instanceof Error ? error.message : error)
  })
}

/**
 * The customer's number for a WhatsApp link: digits with the country code. A Spanish number
 * written without it (9 digits starting with 6, 7, 8 or 9) gets +34.
 */
export function whatsappNumber(phone: string | null): string | null {
  if (!phone) return null
  const digits = phoneDigits(phone)
  if (/^[6789]\d{8}$/.test(digits)) return `34${digits}`
  return digits.length >= 8 ? digits : null
}

/**
 * The WhatsApp message for a payment request, ready for the team to send with one tap: the
 * amount, the payment link, the booking's page and (for a guest) the code that opens it.
 */
export function paymentWhatsappText(booking: Booking, payment: BookingPayment, config: Config): string {
  const es = booking.locale === 'es'
  const locale = es ? 'es' : 'en'
  const name = booking.contactName.trim().split(/\s+/)[0] ?? booking.contactName
  const amount = formatMoney(payment.amountCents, payment.currency, locale)
  const when = formatWhen(booking.pickupAt, config.BUSINESS_TIMEZONE, locale)
  const kind = es ? { advance: 'el anticipo', full: 'el importe total', balance: 'el importe pendiente' }[payment.kind] : { advance: 'the advance', full: 'the full amount', balance: 'the remaining balance' }[payment.kind]
  const lines = es
    ? [
        `Hola ${name}, le escribimos de SignatureMile por su reserva ${booking.reference} (${when}).`,
        `Para confirmarla, pague ${kind} de ${amount} aquí: ${payment.link}`,
        `Su reserva: ${bookingUrl(config, booking)}`,
      ]
    : [
        `Hello ${name}, this is SignatureMile about your booking ${booking.reference} (${when}).`,
        `To confirm it, please pay ${kind} of ${amount} here: ${payment.link}`,
        `Your booking: ${bookingUrl(config, booking)}`,
      ]
  if (booking.userId === null && booking.guestCode) lines.push(es ? `Código de invitado: ${booking.guestCode}` : `Guest code: ${booking.guestCode}`)
  return lines.join('\n')
}

export function paymentWhatsappUrl(booking: Booking, payment: BookingPayment, config: Config): string | null {
  const number = whatsappNumber(booking.contactPhone)
  return number ? `https://wa.me/${number}?text=${encodeURIComponent(paymentWhatsappText(booking, payment, config))}` : null
}

// --- Accounts ----------------------------------------------------------------

/**
 * Give an account the bookings made with its email address while the customer was not logged
 * in (as a guest, through the AI agent or by the team). Only once the address is verified:
 * otherwise anyone could sign up with someone else's email and read their bookings.
 */
export async function claimBookingsByVerifiedEmail(user: { id: string; email: string; emailVerifiedAt: Date | null }): Promise<number> {
  if (!user.emailVerifiedAt) return 0
  const claimed = await db
    .update(bookings)
    .set({ userId: user.id, updatedAt: new Date() })
    .where(and(isNull(bookings.userId), eq(bookings.contactEmail, user.email)))
    .returning({ id: bookings.id })
  return claimed.length
}
