'use client'

import { useI18n } from '@/i18n/client'
import { fill } from '@/i18n/config'
import type { BookingMessages } from '@/i18n/messages/booking'
import { formatDateTime, formatMoney, formatPrice } from '@/lib/format'
import type { BookingChange, BookingEvent, BookingPayment, BookingStatus, PaymentStatus } from '@/lib/types'

/**
 * A booking's history, newest first: what changed, when, who did it and why. The customer sees the
 * same history as the team, on the booking's page.
 */
export function BookingHistory({ events, b, timeZone, currency }: { events: BookingEvent[]; b: BookingMessages; timeZone: string; currency: string }) {
  const { t, locale } = useI18n()
  const h = b.history

  const value = (change: BookingChange, raw: string | null) => {
    if (raw === null || raw === '') return change.field === 'totalCents' ? t.payment.onRequest : '—'
    switch (change.field) {
      case 'pickupAt':
      case 'returnAt':
        return formatDateTime(raw, locale, timeZone)
      case 'totalCents':
        return formatPrice(Number(raw), currency, locale, t.payment.onRequest)
      case 'status':
        return t.status[raw as BookingStatus] ?? raw
      case 'paymentStatus':
        return t.payment[raw as PaymentStatus] ?? raw
      default:
        return raw
    }
  }

  /** A payment step reads as one line: kind and amount. */
  const payment = (event: BookingEvent) => {
    const kind = event.changes.find((change) => change.field === 'paymentKind')?.to as BookingPayment['kind'] | undefined
    const amount = Number(event.changes.find((change) => change.field === 'paymentAmountCents')?.to ?? 0)
    return { kind: kind ? b.details.paymentKinds[kind] : '', amount: formatMoney(amount, currency, locale) }
  }

  const title = (event: BookingEvent) => {
    const name = event.actorName ?? h.team
    switch (event.kind) {
      case 'created':
        return event.actorName ? fill(h.createdByTeam, { name }) : h.created
      case 'edited':
        return fill(h.edited, { name })
      case 'status_changed':
        return !event.actorName && event.changes.some((change) => change.field === 'status' && change.to === 'cancelled') ? h.cancelledByCustomer : h.statusChanged
      case 'payment_requested':
        return fill(h.paymentRequested, payment(event))
      case 'payment_proof':
        return fill(h.paymentProof, payment(event))
      case 'payment_received':
        return fill(h.paymentReceived, payment(event))
      case 'payment_cancelled':
        return fill(h.paymentCancelled, payment(event))
    }
  }

  return (
    <section className="mt-9">
      <h3 className="eyebrow text-gold-700">{h.title}</h3>
      <ol className="mt-3 border-l border-ink-900/15">
        {events.map((event) => {
          const changes = event.kind.startsWith('payment_') ? [] : event.changes
          return (
            <li key={event.id} className="relative pb-6 pl-5 last:pb-0">
              <span aria-hidden className="absolute top-1.5 -left-[0.3125rem] size-2.5 rounded-full border-2 border-white bg-gold-600" />
              <p className="text-sm font-semibold text-ink-900">{title(event)}</p>
              <p className="text-xs text-ink-900/55">
                <time dateTime={event.createdAt}>{formatDateTime(event.createdAt, locale, timeZone)}</time>
                {event.kind === 'status_changed' && event.actorName ? ` · ${fill(h.by, { name: event.actorName })}` : null}
              </p>
              {changes.length > 0 ? (
                <ul className="mt-2 space-y-1 text-sm text-ink-900/75">
                  {changes.map((change) => (
                    <li key={change.field}>
                      <span className="text-ink-900/55">{h.fields[change.field] ?? change.field}:</span> {value(change, change.from)} → <span className="font-medium text-ink-900">{value(change, change.to)}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
              {event.note ? (
                <p className="mt-2 rounded-md bg-bone-100 px-3 py-2 text-sm text-ink-900/80">
                  <span className="font-medium">{h.note}:</span> {event.note}
                </p>
              ) : null}
            </li>
          )
        })}
      </ol>
    </section>
  )
}
