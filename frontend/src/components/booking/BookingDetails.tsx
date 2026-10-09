'use client'

import { Check, X } from 'lucide-react'
import { useRef, useState, type ReactNode } from 'react'
import { Button } from '@/components/ui/Button'
import { FormMessage } from '@/components/ui/Field'
import { useI18n } from '@/i18n/client'
import { fill } from '@/i18n/config'
import type { BookingMessages } from '@/i18n/messages/booking'
import { api, errorMessage } from '@/lib/api'
import { formatBags, formatDateTime, formatDistance, formatDuration, formatMoney, formatPassengers } from '@/lib/format'
import type { Booking, BookingStatus } from '@/lib/types'

const TIMELINE: Exclude<BookingStatus, 'cancelled'>[] = ['pending', 'confirmed', 'in_progress', 'completed']

const STATUS_STYLES: Record<BookingStatus, string> = {
  pending: 'bg-amber-100 text-amber-900',
  confirmed: 'bg-emerald-100 text-emerald-900',
  in_progress: 'bg-sky-100 text-sky-900',
  completed: 'bg-ink-900/10 text-ink-900',
  cancelled: 'bg-red-100 text-red-900',
}

export function StatusBadge({ status }: { status: BookingStatus }) {
  const { t } = useI18n()
  return <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLES[status]}`}>{t.status[status]}</span>
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[7.5rem_1fr] gap-4 py-3 sm:grid-cols-[10rem_1fr]">
      <dt className="text-sm text-ink-900/60">{label}</dt>
      <dd className="text-sm font-medium break-words text-ink-900">{children}</dd>
    </div>
  )
}

/**
 * Everything about one booking: status, ride, payment and (when allowed) a
 * cancel button. Used on the confirmation, tracking, account and admin screens.
 */
export function BookingDetails({
  booking,
  b,
  timeZone,
  /** Needed to cancel as a guest: the email address or phone number the booking was made with. Signed-in owners are recognised by their session. */
  proof,
  onChange,
  hideCancel,
}: {
  booking: Booking
  b: BookingMessages
  timeZone: string
  proof?: { email?: string; phone?: string }
  onChange?: (booking: Booking) => void
  hideCancel?: boolean
}) {
  const { t, locale } = useI18n()
  const dialog = useRef<HTMLDialogElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reached = TIMELINE.indexOf(booking.status as (typeof TIMELINE)[number])
  const cancelled = booking.status === 'cancelled'
  const passengers = booking.adults + booking.children

  const cancel = async () => {
    setBusy(true)
    setError(null)
    try {
      const result = await api<{ booking: Booking }>(`/bookings/${booking.reference}/cancel`, { method: 'POST', body: proof ?? {} })
      dialog.current?.close()
      onChange?.(result.booking)
    } catch (caught) {
      setError(errorMessage(caught, t))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      {/* Status */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-display text-3xl tracking-wide">{booking.reference}</p>
        <StatusBadge status={booking.status} />
      </div>
      <p className="mt-3 text-sm leading-relaxed text-ink-900/65">
        {b.details.statusText[booking.status]}
        {booking.source === 'operator' ? ` ${b.details.byOperator}` : null}
      </p>

      {cancelled ? null : (
        <ol className="mt-7 flex items-start" aria-label={b.details.status}>
          {TIMELINE.map((status, index) => {
            const done = index <= reached
            return (
              <li key={status} className={`flex flex-col ${index > 0 ? 'flex-1 items-end' : 'items-start'}`} aria-current={index === reached ? 'step' : undefined}>
                <div className="flex w-full items-center">
                  {index > 0 ? <span aria-hidden className={`h-0.5 flex-1 ${done ? 'bg-gold-600' : 'bg-ink-900/10'}`} /> : null}
                  <span className={`flex size-7 shrink-0 items-center justify-center rounded-full border-2 ${done ? 'border-gold-600 bg-gold-600 text-white' : 'border-ink-900/15 bg-white text-transparent'}`}>
                    <Check aria-hidden className="size-3.5" />
                  </span>
                </div>
                <span className={`mt-2 text-xs ${done ? 'font-semibold text-ink-900' : 'text-ink-900/60'}`}>{b.details.timeline[status]}</span>
              </li>
            )
          })}
        </ol>
      )}

      {/* Ride */}
      <h3 className="eyebrow mt-9 text-gold-700">{b.details.ride}</h3>
      <dl className="mt-2 divide-y divide-ink-900/10 border-y border-ink-900/10">
        <Row label={b.review.type}>{t.rideTypes[booking.rideType]}</Row>
        <Row label={b.review.from}>{booking.pickup.label}</Row>
        <Row label={b.review.to}>{booking.dropoff?.label ?? b.review.asDirected}</Row>
        <Row label={b.review.when}>{formatDateTime(booking.pickupAt, locale, timeZone)}</Row>
        {booking.returnAt ? <Row label={b.review.returnWhen}>{formatDateTime(booking.returnAt, locale, timeZone)}</Row> : null}
        {booking.hours ? <Row label={b.review.duration}>{fill(t.units.hours, { count: booking.hours })}</Row> : null}
        {booking.route ? (
          <Row label={b.summary.distance}>
            {formatDistance(booking.route.distanceM, t)} · {formatDuration(booking.route.durationS, t)}
          </Row>
        ) : null}
        {booking.flightNumber ? <Row label={b.review.flight}>{booking.flightNumber}</Row> : null}
        <Row label={b.review.passengers}>
          {formatPassengers(passengers, t)} · {formatBags(booking.luggage, t)}
        </Row>
        <Row label={b.review.vehicle}>{booking.vehicleName}</Row>
        <Row label={b.review.contact}>
          {booking.contact.name}
          <span className="block font-normal text-ink-900/60">{[booking.contact.email, booking.contact.phone].filter(Boolean).join(' · ')}</span>
        </Row>
        {booking.contact.company ? <Row label={b.review.company}>{booking.contact.company}</Row> : null}
        {booking.contact.notes ? <Row label={b.review.notes}>{booking.contact.notes}</Row> : null}
      </dl>

      {/* Payment */}
      <div className="mt-7 flex flex-wrap items-end justify-between gap-4 rounded-md bg-bone-100 p-5">
        <div>
          <p className="eyebrow text-ink-900/60">{b.details.payment}</p>
          <p className="mt-2 text-sm text-ink-900/70">
            {t.payment[booking.paymentMethod]} · <span className={booking.paymentStatus === 'paid' ? 'font-semibold text-emerald-700' : ''}>{t.payment[booking.paymentStatus]}</span>
          </p>
        </div>
        <p className="font-display text-4xl">{formatMoney(booking.totalCents, booking.currency, locale)}</p>
      </div>
      {cancelled && booking.paymentStatus === 'paid' ? <p className="mt-3 text-sm text-ink-900/65">{b.details.refundNote}</p> : null}

      {/* Cancel */}
      {hideCancel || cancelled || booking.status === 'completed' ? null : booking.canCancel ? (
        <div className="no-print mt-6">
          <button type="button" onClick={() => dialog.current?.showModal()} className="text-sm font-medium text-red-700 underline-offset-4 hover:underline">
            {b.details.cancel}
          </button>
        </div>
      ) : (
        <p className="no-print mt-6 text-sm text-ink-900/60">{b.details.cancelClosed}</p>
      )}

      <dialog ref={dialog} aria-labelledby={`cancel-${booking.reference}`} className="m-auto w-[min(28rem,calc(100vw-2rem))] rounded-lg bg-bone-50 p-0 text-ink-900 shadow-2xl backdrop:bg-ink-950/70 backdrop:backdrop-blur-sm">
        <div className="p-7">
          <div className="flex items-start justify-between gap-4">
            <h2 id={`cancel-${booking.reference}`} className="display text-3xl">
              {b.details.cancelTitle}
            </h2>
            <button type="button" onClick={() => dialog.current?.close()} aria-label={t.actions.close} className="rounded-full p-1 text-ink-900/60 hover:text-ink-900">
              <X aria-hidden className="size-5" />
            </button>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-ink-900/65">{b.details.cancelText}</p>
          {error ? (
            <div className="mt-4">
              <FormMessage tone="error">{error}</FormMessage>
            </div>
          ) : null}
          <div className="mt-6 flex flex-wrap justify-end gap-3">
            <Button variant="outline" onClick={() => dialog.current?.close()}>
              {b.details.cancelKeep}
            </Button>
            <Button variant="dark" loading={busy} onClick={cancel}>
              {b.details.cancelConfirm}
            </Button>
          </div>
        </div>
      </dialog>
    </div>
  )
}
