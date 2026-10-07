'use client'

import { CircleAlert, CircleCheck, LoaderCircle } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useRef, useState } from 'react'
import { ButtonLink } from '@/components/ui/Button'
import { Accent } from '@/components/ui/Section'
import { useI18n } from '@/i18n/client'
import { fill } from '@/i18n/config'
import type { BookingMessages } from '@/i18n/messages/booking'
import { api } from '@/lib/api'
import { phoneHref, whatsappHref } from '@/lib/contact'
import { useAppConfig, useContactDetails, useHydrated } from '@/lib/hooks'
import type { Booking } from '@/lib/types'
import { BookingDetails } from './BookingDetails'

/** Where PayPal sends the customer back to: `?ref=<booking>&token=<order>` or `&cancelled=1`. */
export function PaymentReturn({ b }: { b: BookingMessages }) {
  const placeholder = <div aria-busy="true" className="mx-auto h-80 max-w-2xl animate-pulse rounded-lg bg-ink-900/5" />
  return useHydrated() ? (
    <Suspense fallback={placeholder}>
      <Outcome b={b} />
    </Suspense>
  ) : (
    placeholder
  )
}

function Outcome({ b }: { b: BookingMessages }) {
  const { t } = useI18n()
  const config = useAppConfig()
  const details = useContactDetails()
  const query = useSearchParams()
  const [params] = useState(() => ({ reference: query.get('ref') ?? '', orderId: query.get('token'), cancelled: query.get('cancelled') === '1' }))
  const [booking, setBooking] = useState<Booking | null>(null)
  const [failed, setFailed] = useState(false)
  const started = useRef(false)

  // Capture the approved payment once. The API makes a repeated capture harmless.
  useEffect(() => {
    if (started.current || params.cancelled || !params.orderId) return
    started.current = true
    api<{ booking: Booking }>('/payments/paypal/capture', { method: 'POST', body: { orderId: params.orderId } })
      .then((result) => setBooking(result.booking))
      .catch(() => setFailed(true))
  }, [params])

  const panel = 'mx-auto max-w-2xl rounded-lg border border-ink-900/10 bg-white p-6 sm:p-10'
  const contact = (
    <div className="mt-7 flex flex-wrap gap-3">
      <ButtonLink href={details ? whatsappHref(details.whatsapp, params.reference) : '/contact'} variant="dark">
        {t.actions.whatsapp}
      </ButtonLink>
      {details ? (
        <ButtonLink href={phoneHref(details.phone)} variant="outline">
          {details.phone}
        </ButtonLink>
      ) : null}
      <ButtonLink href={`/booking/track${params.reference ? `?ref=${encodeURIComponent(params.reference)}` : ''}`} variant="outline">
        {t.nav.track}
      </ButtonLink>
    </div>
  )

  if (params.cancelled) {
    return (
      <div className={panel}>
        <CircleAlert aria-hidden className="size-10 text-amber-600" />
        <h2 className="display mt-5 text-4xl">
          <Accent text={b.pay.cancelledTitle} />
        </h2>
        <p className="mt-4 text-[0.9375rem] leading-relaxed text-ink-900/65">{fill(b.pay.cancelledText, { reference: params.reference })}</p>
        {contact}
      </div>
    )
  }

  if (!params.orderId) {
    return (
      <div className={panel}>
        <p className="text-[0.9375rem] leading-relaxed text-ink-900/65">{b.pay.missing}</p>
        {contact}
      </div>
    )
  }

  if (failed) {
    return (
      <div className={panel}>
        <CircleAlert aria-hidden className="size-10 text-red-600" />
        <h2 className="display mt-5 text-4xl">
          <Accent text={b.pay.failedTitle} />
        </h2>
        <p role="alert" className="mt-4 text-[0.9375rem] leading-relaxed text-ink-900/65">
          {b.pay.failedText}
        </p>
        {contact}
      </div>
    )
  }

  if (!booking) {
    return (
      <div className={`${panel} text-center`} role="status">
        <LoaderCircle aria-hidden className="mx-auto size-10 animate-spin text-gold-600" />
        <h2 className="display mt-5 text-4xl">
          <Accent text={b.pay.processingTitle} />
        </h2>
        <p className="mt-4 text-[0.9375rem] text-ink-900/65">{b.pay.processing}</p>
      </div>
    )
  }

  return (
    <div className={panel}>
      <CircleCheck aria-hidden className="size-10 text-emerald-600" />
      <h2 className="display mt-5 text-4xl">
        <Accent text={b.pay.successTitle} />
      </h2>
      <p className="mt-4 text-[0.9375rem] leading-relaxed text-ink-900/65">{b.pay.successText}</p>
      <div className="mt-8 border-t border-ink-900/10 pt-8">
        <BookingDetails booking={booking} b={b} timeZone={config.timeZone} email={booking.contact.email} onChange={setBooking} />
      </div>
    </div>
  )
}
