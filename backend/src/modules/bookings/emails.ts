import type { Config } from '../../config.js'
import type { Booking, BookingChange, BookingPayment } from '../../db/schema.js'
import { layout } from '../../lib/email-layout.js'
import type { Email } from '../../lib/mailer.js'

/*
 * The emails a customer gets about a booking, in the language they booked in: received (with the
 * guest code), payment requested, updated by the team, confirmed and cancelled. A guest opens the
 * booking's page with its reference and guest code; a customer with an account logs in.
 */

type Locale = 'en' | 'es'
const localeOf = (booking: Pick<Booking, 'locale'>): Locale => (booking.locale === 'es' ? 'es' : 'en')
const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? name

export function formatMoney(cents: number, currency: string, locale: Locale): string {
  return new Intl.NumberFormat(locale === 'es' ? 'es-ES' : 'en-GB', { style: 'currency', currency, maximumFractionDigits: cents % 100 === 0 ? 0 : 2 }).format(cents / 100)
}

/** "Tue 27 Oct 2026, 10:00" in the business's time zone. */
export function formatWhen(date: Date, timeZone: string, locale: Locale): string {
  return new Intl.DateTimeFormat(locale === 'es' ? 'es-ES' : 'en-GB', { timeZone, weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(date)
}

/** The booking's page on the website. */
export const bookingUrl = (config: Config, booking: Pick<Booking, 'reference' | 'locale'>) =>
  `${config.APP_URL.replace(/\/+$/, '')}/${localeOf(booking)}/booking/${booking.reference}`

const copy = {
  en: {
    hello: (name: string) => `Hello ${name},`,
    reference: 'Reference',
    when: 'Pickup',
    from: 'From',
    to: 'To',
    returnAt: 'Return',
    hours: 'Hours',
    vehicle: 'Vehicle',
    passengers: 'Passengers',
    price: 'Price',
    toBeConfirmed: 'To be confirmed',
    view: 'View your booking',
    code: 'Your guest code: you need it, with the reference, to open your booking',
    account: 'You can also see it in your account: log in with this email address.',
    cancelPolicy: (hours: number) => `Free cancellation up to ${hours} hours before pickup, from your booking's page.`,
    questions: 'Questions? Reply to this email, or call or WhatsApp us.',
    receivedSubject: (ref: string) => `Booking received: ${ref}`,
    received: (ref: string) => `Thank you for booking with SignatureMile. We have received your booking ${ref} and are checking it now.`,
    receivedNext: 'Next, we will ask you for an advance or the full amount: the secure payment link will be on your booking’s page. Your booking is confirmed as soon as it is paid.',
    receivedOnRequest: 'The price of this ride is agreed with you: we will be in touch to confirm it, then send you a secure payment link. Your booking is confirmed as soon as it is paid.',
    confirmedSubject: (ref: string) => `Booking confirmed: ${ref}`,
    confirmed: (ref: string) => `Your booking ${ref} is confirmed. We look forward to driving you.`,
    paymentSubject: (ref: string) => `Payment to confirm your booking ${ref}`,
    kind: { advance: 'advance', full: 'full amount', balance: 'remaining balance' },
    payment: (ref: string, kind: string, amount: string) => `To confirm your booking ${ref}, please pay the ${kind} of ${amount}. Open your booking with the button below: the secure payment link is there.`,
    paymentRemaining: (amount: string) => `After this payment, ${amount} remains to be paid.`,
    paymentProof: 'Once you have paid, tap “Payment done” on the same page and upload a screenshot or PDF of the payment confirmation.',
    paymentAfter: 'We will check it and confirm your booking by email.',
    updatedSubject: (ref: string) => `Your booking ${ref} was updated`,
    updated: (ref: string) => `We have updated your booking ${ref}.`,
    note: (note: string) => `Note from our team: ${note}`,
    updatedCheck: 'If anything is not right, reply to this email or call us.',
    cancelledSubject: (ref: string) => `Booking cancelled: ${ref}`,
    cancelled: (ref: string) => `Your booking ${ref} has been cancelled.`,
    cancelledPaid: 'If you have already paid, we will contact you about it.',
    verifySubject: (code: string) => `Your SignatureMile code: ${code}`,
    verify: 'Here is your code to confirm your email address:',
    verifyCode: 'Your code',
    verifyAfter: (minutes: number) => `It works for ${minutes} minutes. Once your address is confirmed, the bookings made with it appear in your account. If you did not ask for this, you can ignore this email.`,
    field: {
      pickupAt: 'Pickup',
      returnAt: 'Return',
      hours: 'Hours',
      pickup: 'From',
      dropoff: 'To',
      vehicle: 'Vehicle',
      totalCents: 'Price',
      adults: 'Adults',
      children: 'Children',
      luggage: 'Luggage',
      flightNumber: 'Flight',
      contactName: 'Name',
      contactEmail: 'Email',
      contactPhone: 'Phone',
      company: 'Company',
      notes: 'Notes',
      status: 'Status',
    } as Record<string, string>,
    status: { pending: 'Received', confirmed: 'Confirmed', in_progress: 'On the way', completed: 'Completed', cancelled: 'Cancelled' } as Record<string, string>,
  },
  es: {
    hello: (name: string) => `Hola ${name}:`,
    reference: 'Referencia',
    when: 'Recogida',
    from: 'Desde',
    to: 'Hasta',
    returnAt: 'Vuelta',
    hours: 'Horas',
    vehicle: 'Vehículo',
    passengers: 'Pasajeros',
    price: 'Precio',
    toBeConfirmed: 'Por confirmar',
    view: 'Ver su reserva',
    code: 'Su código de invitado: lo necesita, con la referencia, para abrir su reserva',
    account: 'También puede verla en su cuenta: inicie sesión con este correo electrónico.',
    cancelPolicy: (hours: number) => `Cancelación gratuita hasta ${hours} horas antes de la recogida, desde la página de su reserva.`,
    questions: '¿Alguna pregunta? Responda a este correo, o llámenos o escríbanos por WhatsApp.',
    receivedSubject: (ref: string) => `Reserva recibida: ${ref}`,
    received: (ref: string) => `Gracias por reservar con SignatureMile. Hemos recibido su reserva ${ref} y la estamos revisando.`,
    receivedNext: 'A continuación le pediremos un anticipo o el importe total: el enlace de pago seguro estará en la página de su reserva. Su reserva queda confirmada en cuanto se paga.',
    receivedOnRequest: 'El precio de este servicio se acuerda con usted: le contactaremos para confirmarlo y después le enviaremos un enlace de pago seguro. Su reserva queda confirmada en cuanto se paga.',
    confirmedSubject: (ref: string) => `Reserva confirmada: ${ref}`,
    confirmed: (ref: string) => `Su reserva ${ref} está confirmada. Será un placer llevarle.`,
    paymentSubject: (ref: string) => `Pago para confirmar su reserva ${ref}`,
    kind: { advance: 'anticipo', full: 'importe total', balance: 'importe pendiente' },
    payment: (ref: string, kind: string, amount: string) => `Para confirmar su reserva ${ref}, pague el ${kind} de ${amount}. Abra su reserva con el botón de abajo: allí encontrará el enlace de pago seguro.`,
    paymentRemaining: (amount: string) => `Después de este pago, quedarán ${amount} por pagar.`,
    paymentProof: 'Cuando haya pagado, pulse «Pago realizado» en la misma página y suba una captura de pantalla o un PDF del justificante de pago.',
    paymentAfter: 'Lo comprobaremos y le confirmaremos la reserva por correo.',
    updatedSubject: (ref: string) => `Se ha actualizado su reserva ${ref}`,
    updated: (ref: string) => `Hemos actualizado su reserva ${ref}.`,
    note: (note: string) => `Nota de nuestro equipo: ${note}`,
    updatedCheck: 'Si algo no es correcto, responda a este correo o llámenos.',
    cancelledSubject: (ref: string) => `Reserva cancelada: ${ref}`,
    cancelled: (ref: string) => `Su reserva ${ref} ha sido cancelada.`,
    cancelledPaid: 'Si ya ha pagado, le contactaremos al respecto.',
    verifySubject: (code: string) => `Su código de SignatureMile: ${code}`,
    verify: 'Este es su código para confirmar su correo electrónico:',
    verifyCode: 'Su código',
    verifyAfter: (minutes: number) => `Funciona durante ${minutes} minutos. Una vez confirmado, las reservas hechas con este correo aparecen en su cuenta. Si no lo ha pedido usted, ignore este correo.`,
    field: {
      pickupAt: 'Recogida',
      returnAt: 'Vuelta',
      hours: 'Horas',
      pickup: 'Desde',
      dropoff: 'Hasta',
      vehicle: 'Vehículo',
      totalCents: 'Precio',
      adults: 'Adultos',
      children: 'Niños',
      luggage: 'Equipaje',
      flightNumber: 'Vuelo',
      contactName: 'Nombre',
      contactEmail: 'Correo',
      contactPhone: 'Teléfono',
      company: 'Empresa',
      notes: 'Notas',
      status: 'Estado',
    } as Record<string, string>,
    status: { pending: 'Recibida', confirmed: 'Confirmada', in_progress: 'En camino', completed: 'Completada', cancelled: 'Cancelada' } as Record<string, string>,
  },
} as const

/** A changed value, written out for the customer: dates, prices and statuses in their language. */
export function formatChangeValue(change: Pick<BookingChange, 'field'>, value: string | null, booking: Pick<Booking, 'currency' | 'locale'>, config: Config): string {
  const locale = localeOf(booking)
  if (value === null || value === '') return change.field === 'totalCents' ? copy[locale].toBeConfirmed : '—'
  if (change.field === 'pickupAt' || change.field === 'returnAt') return formatWhen(new Date(value), config.BUSINESS_TIMEZONE, locale)
  if (change.field === 'totalCents') return formatMoney(Number(value), booking.currency, locale)
  if (change.field === 'status') return copy[locale].status[value] ?? value
  return value
}

function details(booking: Booking, config: Config): [string, string][] {
  const c = copy[localeOf(booking)]
  const locale = localeOf(booking)
  const rows: [string, string][] = [
    [c.reference, booking.reference],
    [c.when, formatWhen(booking.pickupAt, config.BUSINESS_TIMEZONE, locale)],
    [c.from, booking.pickupLabel],
  ]
  if (booking.dropoffLabel) rows.push([c.to, booking.dropoffLabel])
  if (booking.returnAt) rows.push([c.returnAt, formatWhen(booking.returnAt, config.BUSINESS_TIMEZONE, locale)])
  if (booking.hours) rows.push([c.hours, String(booking.hours)])
  rows.push([c.vehicle, booking.vehicleName])
  rows.push([c.passengers, String(booking.adults + booking.children)])
  rows.push([c.price, booking.totalCents === null ? c.toBeConfirmed : formatMoney(booking.totalCents, booking.currency, locale)])
  return rows
}

/** How the customer opens the booking: the guest code, or their account. */
function access(booking: Booking) {
  const c = copy[localeOf(booking)]
  return booking.userId === null && booking.guestCode ? { code: { label: c.code, value: booking.guestCode }, footer: [] } : { footer: [c.account] }
}

function compose(booking: Booking, config: Config, subject: string, paragraphs: string[], extra: { details?: [string, string][]; footer?: string[]; text?: string[] } = {}): Email {
  const c = copy[localeOf(booking)]
  const url = bookingUrl(config, booking)
  const { code, footer: accessFooter } = access(booking)
  const footer = [...(extra.footer ?? []), ...accessFooter, c.questions]
  const rows = extra.details ?? details(booking, config)
  const text = [
    ...paragraphs,
    rows.map(([label, value]) => `${label}: ${value}`).join('\n'),
    ...(code ? [`${code.label}: ${code.value}`] : []),
    `${c.view}: ${url}`,
    ...(extra.text ?? []),
    ...footer,
  ]
  return {
    to: booking.contactEmail ?? '',
    subject,
    text: `${text.join('\n\n')}\n`,
    html: layout(paragraphs, { details: rows, code, button: { label: c.view, url }, footer: [...(extra.text ?? []), ...footer] }),
  }
}

/** Sent when the booking is made: received (waiting for payment), or already confirmed when the team entered it. */
export function bookingReceivedEmail(booking: Booking, config: Config): Email {
  const c = copy[localeOf(booking)]
  const name = c.hello(firstName(booking.contactName))
  if (booking.status === 'confirmed') return compose(booking, config, c.confirmedSubject(booking.reference), [name, c.confirmed(booking.reference)])
  return compose(booking, config, c.receivedSubject(booking.reference), [name, c.received(booking.reference), booking.totalCents === null ? c.receivedOnRequest : c.receivedNext], {
    footer: [c.cancelPolicy(config.FREE_CANCEL_HOURS)],
  })
}

/**
 * Asks for a payment. The email carries the booking's page, not the payment link: the customer pays
 * there and uploads the confirmation with "Payment done". `remainingCents` is what is still to pay
 * once this payment is in (an advance leaves the rest).
 */
export function paymentRequestedEmail(booking: Booking, payment: BookingPayment, remainingCents: number, config: Config): Email {
  const locale = localeOf(booking)
  const c = copy[locale]
  const amount = formatMoney(payment.amountCents, payment.currency, locale)
  const remaining = remainingCents > 0 ? [c.paymentRemaining(formatMoney(remainingCents, payment.currency, locale))] : []
  return compose(booking, config, c.paymentSubject(booking.reference), [
    c.hello(firstName(booking.contactName)),
    c.payment(booking.reference, c.kind[payment.kind], amount),
    ...remaining,
    c.paymentProof,
    c.paymentAfter,
  ])
}

export function bookingUpdatedEmail(booking: Booking, changes: BookingChange[], note: string, config: Config): Email {
  const c = copy[localeOf(booking)]
  const rows: [string, string][] = changes.map((change) => [
    c.field[change.field] ?? change.field,
    `${formatChangeValue(change, change.from, booking, config)} → ${formatChangeValue(change, change.to, booking, config)}`,
  ])
  return compose(booking, config, c.updatedSubject(booking.reference), [c.hello(firstName(booking.contactName)), c.updated(booking.reference), c.note(note), c.updatedCheck], { details: rows })
}

export function bookingConfirmedEmail(booking: Booking, config: Config): Email {
  const c = copy[localeOf(booking)]
  return compose(booking, config, c.confirmedSubject(booking.reference), [c.hello(firstName(booking.contactName)), c.confirmed(booking.reference)])
}

export function bookingCancelledEmail(booking: Booking, note: string | null, config: Config): Email {
  const c = copy[localeOf(booking)]
  const paragraphs = [c.hello(firstName(booking.contactName)), c.cancelled(booking.reference)]
  if (note) paragraphs.push(c.note(note))
  if (booking.paymentStatus !== 'unpaid') paragraphs.push(c.cancelledPaid)
  return compose(booking, config, c.cancelledSubject(booking.reference), paragraphs)
}

export function verifyEmailCodeEmail(to: string, name: string, code: string, minutes: number, locale: Locale): Email {
  const c = copy[locale]
  const paragraphs = [c.hello(firstName(name)), c.verify]
  const after = c.verifyAfter(minutes)
  return {
    to,
    subject: c.verifySubject(code),
    text: `${[...paragraphs, code, after].join('\n\n')}\n`,
    html: layout(paragraphs, { code: { label: c.verifyCode, value: code }, footer: [after] }),
  }
}
