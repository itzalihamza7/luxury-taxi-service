'use client'

import { CircleCheck, ExternalLink, FileCheck2 } from 'lucide-react'
import { useId, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { useI18n } from '@/i18n/client'
import { fill } from '@/i18n/config'
import type { BookingMessages } from '@/i18n/messages/booking'
import { errorMessage, uploadPaymentProof } from '@/lib/api'
import { formatDateTime, formatMoney } from '@/lib/format'
import type { Booking, BookingPayment } from '@/lib/types'

/** What the server takes as proof of payment, up to 8 MB. */
const PROOF_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
const PROOF_MAX_BYTES = 8 * 1024 * 1024

/**
 * The payments the team asked for: each open one with its "Pay" button (the business's payment
 * link) and the "Payment done" step, which needs proof of the payment; each received one with its
 * date. Withdrawn links are left out. Below them, what is still to pay.
 */
export function BookingPayments({
  booking,
  payments,
  b,
  timeZone,
  code,
  onChange,
}: {
  booking: Booking
  payments: BookingPayment[]
  b: BookingMessages
  timeZone: string
  /** The guest code that opened the page; signed-in owners are recognised by their session. */
  code?: string
  onChange?: (booking: Booking) => void
}) {
  const { t, locale } = useI18n()
  const d = b.details
  const shown = payments.filter((payment) => payment.status !== 'cancelled')
  const open = booking.status === 'pending' || booking.status === 'confirmed'
  const paidCents = shown.filter((payment) => payment.status === 'paid').reduce((sum, payment) => sum + payment.amountCents, 0)
  const remainingCents = booking.totalCents === null ? 0 : Math.max(0, booking.totalCents - paidCents)

  return (
    <section className="mt-7">
      <h3 className="eyebrow text-gold-700">{d.payments}</h3>
      {shown.length === 0 ? (
        open ? <p className="mt-3 text-sm leading-relaxed text-ink-900/65">{d.noPayments}</p> : null
      ) : (
        <ul className="mt-3 space-y-3">
          {shown.map((payment) => {
            const amount = formatMoney(payment.amountCents, payment.currency, locale)
            return (
              <li key={payment.id} className="rounded-md border border-ink-900/10 bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold">
                      {d.paymentKinds[payment.kind]} · {amount}
                    </p>
                    <p className="mt-0.5 text-xs text-ink-900/55">
                      {payment.status === 'paid' && payment.paidAt
                        ? fill(d.receivedOn, { date: formatDateTime(payment.paidAt, locale, timeZone) })
                        : fill(d.requestedOn, { date: formatDateTime(payment.requestedAt, locale, timeZone) })}
                    </p>
                  </div>
                  {payment.status === 'paid' ? (
                    <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700">
                      <CircleCheck aria-hidden className="size-4" />
                      {t.payment.paid}
                    </span>
                  ) : payment.link && open ? (
                    <a
                      href={payment.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-11 items-center gap-2 rounded-full bg-gold-400 px-5 text-sm font-semibold text-ink-950 transition-colors hover:bg-gold-300"
                    >
                      {fill(d.pay, { amount })}
                      <ExternalLink aria-hidden className="size-4" />
                    </a>
                  ) : null}
                </div>
                {payment.status === 'requested' && open ? <PaymentDone booking={booking} payment={payment} b={b} timeZone={timeZone} code={code} onChange={onChange} /> : null}
              </li>
            )
          })}
        </ul>
      )}
      {shown.length > 0 && open && booking.totalCents !== null && remainingCents > 0 ? (
        <p className="mt-3 text-sm font-medium text-ink-900">{fill(d.remaining, { amount: formatMoney(remainingCents, booking.currency, locale) })}</p>
      ) : null}
      {shown.some((payment) => payment.status === 'requested') && open ? <p className="mt-3 text-xs leading-relaxed text-ink-900/55">{d.payNote}</p> : null}
    </section>
  )
}

/**
 * "Payment done", once the customer has paid: it only works with a screenshot or PDF of the
 * payment confirmation attached. After that the team checks it; a different file can still be sent.
 */
function PaymentDone({
  booking,
  payment,
  b,
  timeZone,
  code,
  onChange,
}: {
  booking: Booking
  payment: BookingPayment
  b: BookingMessages
  timeZone: string
  code?: string
  onChange?: (booking: Booking) => void
}) {
  const { t, locale } = useI18n()
  const d = b.details
  const id = useId()
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [replacing, setReplacing] = useState(false)

  if (payment.proofUploadedAt && !replacing) {
    return (
      <div className="mt-4 flex flex-wrap items-start justify-between gap-3 rounded-md bg-emerald-50 px-4 py-3 text-sm text-emerald-900" role="status">
        <p className="flex items-start gap-2">
          <FileCheck2 aria-hidden className="mt-0.5 size-4 shrink-0" />
          {fill(d.proofReceived, { date: formatDateTime(payment.proofUploadedAt, locale, timeZone) })}
        </p>
        <button type="button" onClick={() => setReplacing(true)} className="text-sm font-medium underline underline-offset-4 hover:text-emerald-700">
          {d.proofReplace}
        </button>
      </div>
    )
  }

  const choose = (chosen: File | null) => {
    setError(null)
    if (chosen && !PROOF_TYPES.includes(chosen.type)) {
      setFile(null)
      setError(d.proofWrongType)
    } else if (chosen && chosen.size > PROOF_MAX_BYTES) {
      setFile(null)
      setError(d.proofTooBig)
    } else {
      setFile(chosen)
    }
  }

  const send = async () => {
    if (!file) return
    setBusy(true)
    setError(null)
    try {
      onChange?.(await uploadPaymentProof<Booking>(booking.reference, payment.id, file, code))
      setReplacing(false)
      setFile(null)
    } catch (caught) {
      setError(errorMessage(caught, t))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mt-4 border-t border-ink-900/10 pt-4">
      <label htmlFor={`${id}-proof`} className="block text-sm font-medium text-ink-900">
        {d.proofLabel}
      </label>
      <input
        id={`${id}-proof`}
        type="file"
        accept={PROOF_TYPES.join(',')}
        aria-describedby={`${id}-hint`}
        onChange={(event) => choose(event.target.files?.[0] ?? null)}
        className="mt-2 block w-full min-w-0 text-sm text-ink-900/75 file:mr-3 file:rounded-full file:border-0 file:bg-ink-950 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-bone-50 hover:file:bg-ink-900"
      />
      <p id={`${id}-hint`} className="mt-2 text-xs leading-relaxed text-ink-900/55">
        {d.proofHint}
      </p>
      {error ? (
        <p role="alert" className="mt-2 text-sm text-red-600">
          {error}
        </p>
      ) : null}
      <Button variant="dark" className="mt-3" disabled={!file} loading={busy} onClick={() => void send()}>
        {d.paymentDone}
      </Button>
    </div>
  )
}
