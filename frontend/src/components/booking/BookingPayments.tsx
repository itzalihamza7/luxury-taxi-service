'use client'

import { CircleCheck, ExternalLink } from 'lucide-react'
import { useI18n } from '@/i18n/client'
import { fill } from '@/i18n/config'
import type { BookingMessages } from '@/i18n/messages/booking'
import { formatDateTime, formatMoney } from '@/lib/format'
import type { Booking, BookingPayment } from '@/lib/types'

/**
 * The payments the team asked for: each open one with its "Pay" button (the business's payment
 * link), each received one with its date. Withdrawn links are left out.
 */
export function BookingPayments({ booking, payments, b, timeZone }: { booking: Booking; payments: BookingPayment[]; b: BookingMessages; timeZone: string }) {
  const { t, locale } = useI18n()
  const d = b.details
  const shown = payments.filter((payment) => payment.status !== 'cancelled')
  const open = booking.status === 'pending' || booking.status === 'confirmed'

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
              <li key={payment.id} className="flex flex-wrap items-center justify-between gap-4 rounded-md border border-ink-900/10 bg-white p-4">
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
              </li>
            )
          })}
        </ul>
      )}
      {shown.some((payment) => payment.status === 'requested') && open ? <p className="mt-3 text-xs leading-relaxed text-ink-900/55">{d.payNote}</p> : null}
    </section>
  )
}
