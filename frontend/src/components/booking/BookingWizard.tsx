'use client'

import { ArrowLeft, Check, CircleCheck, Copy, Printer } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useRef, useState } from 'react'
import { useAuth } from '@/components/auth/AuthProvider'
import { Button, ButtonLink } from '@/components/ui/Button'
import { FormMessage } from '@/components/ui/Field'
import { Accent } from '@/components/ui/Section'
import { useI18n } from '@/i18n/client'
import { fill } from '@/i18n/config'
import type { BookingMessages } from '@/i18n/messages/booking'
import { api, ApiError, errorMessage } from '@/lib/api'
import { clearDraft, clearFieldErrors, emptyDraft, loadDraft, normalizeFields, quoteRequest, rememberBooking, RIDE_FIELDS, saveDraft, validateRide, type Draft } from '@/lib/booking-draft'
import { formatBags, formatDistance, formatDuration, formatFormDateTime, formatMoney, formatPassengers, formatPrice } from '@/lib/format'
import { useAppConfig, useHydrated } from '@/lib/hooks'
import { RIDE_TYPES, type Booking, type Quote, type QuoteOption, type RideType } from '@/lib/types'
import { BookingDetails } from './BookingDetails'
import { STEP_ORDER, StepIndicator, type StepId } from './controls'
import { findPlace } from './PlaceInput'
import { ContactStep, PaymentStep, ReviewStep, RideStep, VehicleStep, withProfile, type AuthMode, type Errors } from './steps'

/** Values carried in the link that opened the form, e.g. `/booking?type=airport&vehicle=mercedes-s-class`. */
function readPrefill(params: URLSearchParams) {
  const type = params.get('type')
  return {
    type: RIDE_TYPES.includes(type as RideType) ? (type as RideType) : null,
    vehicle: params.get('vehicle'),
    from: params.get('from'),
    to: params.get('to'),
    /** Set by the home page form: go straight to the prices. */
    quote: params.get('quote') === '1',
  }
}

function validateContact(contact: Draft['contact']): Errors {
  const errors: Errors = {}
  const digits = contact.phone.replace(/\D/g, '').length
  if (contact.name.trim().length < 2) errors['contact.name'] = contact.name.trim() ? 'too_short' : 'required'
  if (!contact.email.trim()) errors['contact.email'] = 'required'
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email.trim())) errors['contact.email'] = 'invalid_email'
  if (!contact.phone.trim()) errors['contact.phone'] = 'required'
  else if (!/^\+?[\d\s().-]+$/.test(contact.phone.trim()) || digits < 7 || digits > 15) errors['contact.phone'] = 'invalid_phone'
  return errors
}

export function BookingWizard({ b }: { b: BookingMessages }) {
  const placeholder = <div aria-busy="true" className="h-[40rem] animate-pulse rounded-lg bg-ink-900/5" />
  // The form depends on the saved draft, the current time and the link that opened it,
  // which only exist in the browser.
  return useHydrated() ? (
    <Suspense fallback={placeholder}>
      <Wizard b={b} />
    </Suspense>
  ) : (
    placeholder
  )
}

function Wizard({ b }: { b: BookingMessages }) {
  const { t, locale } = useI18n()
  const { user } = useAuth()
  const config = useAppConfig()
  const top = useRef<HTMLDivElement>(null)
  const started = useRef(false)

  // From the router, not `window.location`: while a link is being followed the
  // browser's address bar still shows the page the visitor is leaving.
  const searchParams = useSearchParams()
  const [now] = useState(() => Date.now())
  const [prefill] = useState(() => readPrefill(new URLSearchParams(searchParams.toString())))
  const [draft, setDraft] = useState<Draft>(() => {
    const saved = loadDraft()
    return { ...saved, rideType: prefill.type ?? saved.rideType, vehicleSlug: prefill.vehicle ?? saved.vehicleSlug }
  })
  const [step, setStep] = useState<StepId>('ride')
  const [reached, setReached] = useState<StepId>('ride')
  const [quote, setQuote] = useState<Quote | null>(null)
  const [errors, setErrors] = useState<Errors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [authMode, setAuthMode] = useState<AuthMode>('guest')
  const [accepted, setAccepted] = useState(false)
  const [redirecting, setRedirecting] = useState(false)
  const [done, setDone] = useState<Booking | null>(null)
  const [copied, setCopied] = useState(false)

  const selected: QuoteOption | undefined = quote?.options.find((option) => option.available && option.vehicle.slug === draft.vehicleSlug)

  // Keep the draft on this device so the customer can come back to it.
  useEffect(() => {
    if (!done && !redirecting) saveDraft(draft)
  }, [draft, done, redirecting])

  const scrollToTop = () => window.requestAnimationFrame(() => top.current?.scrollIntoView({ block: 'start' }))

  const goTo = (next: StepId) => {
    setStep(next)
    setFormError(null)
    if (STEP_ORDER.indexOf(next) > STEP_ORDER.indexOf(reached)) setReached(next)
    scrollToTop()
  }

  const patch = (changes: Partial<Draft>) => {
    setDraft((current) => ({ ...current, ...changes }))
    const keys = Object.keys(changes) as (keyof Draft)[]
    if (keys.some((key) => RIDE_FIELDS.includes(key))) {
      // The journey changed: the price on screen no longer applies.
      setQuote(null)
      setReached('ride')
    }
    setErrors((current) => clearFieldErrors(current, keys))
  }

  /** Step 1 -> 2: ask the API to price the journey for every vehicle. */
  const requestQuote = async (current: Draft): Promise<void> => {
    const invalid = validateRide(current)
    if (Object.keys(invalid).length > 0) {
      setErrors(invalid)
      setStep('ride')
      return
    }
    setBusy(true)
    setFormError(null)
    setErrors({})
    try {
      const result = await api<{ quote: Quote }>('/quotes', { method: 'POST', body: quoteRequest(current) })
      setQuote(result.quote)
      // Keep a preferred vehicle only if it can actually carry this group.
      const stillFits = result.quote.options.some((option) => option.available && option.vehicle.slug === current.vehicleSlug)
      if (!stillFits) setDraft((latest) => ({ ...latest, vehicleSlug: null }))
      setStep('vehicle')
      setReached('vehicle')
      scrollToTop()
    } catch (caught) {
      setStep('ride')
      if (caught instanceof ApiError && caught.code === 'VALIDATION') setErrors(normalizeFields(caught.fields))
      else setFormError(errorMessage(caught, t))
    } finally {
      setBusy(false)
    }
  }

  // Apply places named in the link (e.g. from a route page) and, when asked, go straight to the prices.
  useEffect(() => {
    if (started.current) return
    started.current = true
    void (async () => {
      const [from, to] = await Promise.all([prefill.from ? findPlace(prefill.from, locale) : null, prefill.to ? findPlace(prefill.to, locale) : null])
      const next: Draft = { ...draft, pickup: from ?? draft.pickup, dropoff: to ?? draft.dropoff }
      if (from || to) setDraft(next)
      // Drop the one-off values from the address so a reload does not re-apply them over later edits.
      if (searchParams.size > 0) window.history.replaceState(null, '', window.location.pathname)
      if (prefill.quote) await requestQuote(next)
    })()
    // Runs once, with the values the form opened with.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /** Final step: create the booking from the quote. */
  const submitBooking = async (): Promise<void> => {
    if (!quote || !selected) return goTo('vehicle')
    if (!accepted) return setErrors({ acceptTerms: 'accept_terms' })

    const send = (quoteId: string, vehicleId: string) =>
      api<{ booking: Booking; payment: { approveUrl: string } | null }>('/bookings', {
        method: 'POST',
        body: {
          quoteId,
          vehicleId,
          contact: draft.contact,
          flightNumber: draft.flightNumber || null,
          paymentMethod: config.onlinePayments && selected?.totalCents !== null ? draft.paymentMethod : 'chauffeur',
          acceptTerms: true,
          locale,
        },
      })

    setBusy(true)
    setFormError(null)
    try {
      let result
      try {
        result = await send(quote.id, selected.vehicleId)
      } catch (caught) {
        const expired = caught instanceof ApiError && (caught.code === 'QUOTE_EXPIRED' || caught.code === 'QUOTE_NOT_FOUND')
        if (!expired) throw caught
        // The price lapsed while the form was open. Refresh it, and carry on only if it is unchanged.
        const fresh = (await api<{ quote: Quote }>('/quotes', { method: 'POST', body: quoteRequest(draft) })).quote
        setQuote(fresh)
        const same = fresh.options.find((option) => option.available && option.vehicle.slug === selected.vehicle.slug)
        if (!same || same.totalCents !== selected.totalCents) {
          setStep('vehicle')
          setFormError(t.errors.QUOTE_EXPIRED)
          scrollToTop()
          return
        }
        result = await send(fresh.id, same.vehicleId)
      }

      rememberBooking(result.booking.reference, result.booking.contact.email ?? draft.contact.email)
      clearDraft()
      if (result.payment) {
        setRedirecting(true)
        window.location.assign(result.payment.approveUrl)
        return
      }
      setDone(result.booking)
      scrollToTop()
    } catch (caught) {
      if (caught instanceof ApiError && caught.code === 'VALIDATION') {
        const fields = normalizeFields(caught.fields)
        setErrors(fields)
        setFormError(t.errors.VALIDATION)
        if (Object.keys(fields).some((field) => field.startsWith('contact.'))) setStep('contact')
      } else if (caught instanceof ApiError && caught.code === 'LEAD_TIME') {
        setQuote(null)
        setReached('ride')
        setStep('ride')
        setErrors({ pickupTime: 'lead_time' })
        scrollToTop()
      } else {
        setFormError(errorMessage(caught, t))
      }
    } finally {
      setBusy(false)
    }
  }

  const next = () => {
    if (step === 'ride') return void requestQuote(draft)
    if (step === 'vehicle') {
      if (!selected) return setErrors({ vehicle: 'required' })
      setDraft((current) => ({ ...current, contact: withProfile(current.contact, user) }))
      return goTo('contact')
    }
    if (step === 'contact') {
      const invalid = validateContact(draft.contact)
      if (Object.keys(invalid).length > 0) return setErrors(invalid)
      return goTo('review')
    }
    if (step === 'review') return goTo('payment')
    return void submitBooking()
  }

  const startOver = () => {
    setDraft({ ...emptyDraft(), contact: withProfile(emptyDraft().contact, user) })
    setQuote(null)
    setDone(null)
    setAccepted(false)
    setErrors({})
    setFormError(null)
    setStep('ride')
    setReached('ride')
    scrollToTop()
  }

  /* ---------------------------------------------------------------- Done */

  if (done) {
    const copy = async () => {
      await navigator.clipboard?.writeText(done.reference).catch(() => undefined)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    }
    return (
      <div ref={top} className="mx-auto max-w-3xl scroll-mt-28">
        <div className="rounded-lg border border-ink-900/10 bg-white p-6 sm:p-10">
          <span className="flex size-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
            <CircleCheck aria-hidden className="size-7" />
          </span>
          <p className="eyebrow mt-6 text-gold-700">{b.done.eyebrow}</p>
          <h2 className="display mt-3 text-4xl sm:text-5xl">
            <Accent text={fill(b.done.title, { name: done.contact.name.split(' ')[0] ?? '' })} />
          </h2>
          <p className="mt-4 max-w-xl text-[0.9375rem] leading-relaxed text-ink-900/65">{b.done.text}</p>

          <div className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-md bg-ink-950 p-5 text-bone-50">
            <div>
              <p className="eyebrow text-gold-300">{b.done.reference}</p>
              <p className="mt-1 font-display text-4xl tracking-wide" data-testid="booking-reference">
                {done.reference}
              </p>
            </div>
            <Button variant="outline-light" onClick={copy} className="no-print">
              {copied ? <Check aria-hidden className="size-4" /> : <Copy aria-hidden className="size-4" />}
              {copied ? b.done.copied : b.done.copy}
            </Button>
          </div>
          <p className="mt-3 text-sm text-ink-900/60">{done.isGuest ? b.done.keep : b.done.keepAccount}</p>
          <p className="mt-2 text-sm font-medium">
            {done.paymentStatus === 'paid'
              ? b.done.paid
              : done.totalCents === null
                ? b.done.onRequest
                : fill(b.done.price, { price: formatMoney(done.totalCents, done.currency, locale) })}
          </p>

          <div className="mt-9 border-t border-ink-900/10 pt-8">
            <BookingDetails booking={done} b={b} timeZone={config.timeZone} proof={{ email: done.contact.email ?? undefined }} onChange={setDone} />
          </div>

          <div className="no-print mt-9 flex flex-wrap gap-3">
            <ButtonLink href={done.isGuest ? `/booking/${done.reference}` : '/account'} variant="dark" arrow>
              {done.isGuest ? b.done.track : b.done.account}
            </ButtonLink>
            <Button variant="outline" onClick={() => window.print()}>
              <Printer aria-hidden className="size-4" />
              {t.actions.print}
            </Button>
            <Button variant="ghost" onClick={startOver} className="ml-auto self-center">
              {b.done.another}
            </Button>
          </div>
        </div>
      </div>
    )
  }

  /* -------------------------------------------------------------- Wizard */

  const titles: Record<StepId, string> = {
    ride: b.ride.title,
    vehicle: b.vehicle.title,
    contact: b.contact.title,
    review: b.review.title,
    payment: config.onlinePayments && selected?.totalCents !== null ? b.payment.title : b.payment.confirmTitle,
  }
  const stepIndex = STEP_ORDER.indexOf(step)
  const online = config.onlinePayments && draft.paymentMethod === 'online' && selected?.totalCents !== null
  const primaryLabel = step === 'ride' ? b.ride.submit : step === 'payment' ? (redirecting ? b.payment.redirecting : online ? b.payment.confirmOnline : b.payment.confirm) : t.actions.next
  // The sign-in and registration forms have their own submit button.
  const gated = step === 'contact' && !user && authMode !== 'guest'

  return (
    <div ref={top} className="grid scroll-mt-28 gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-12">
      <div className="min-w-0">
        <StepIndicator current={step} reached={reached} onSelect={goTo} t={b} />

        <div className="mt-8 rounded-lg border border-ink-900/10 bg-white p-5 sm:p-9">
          <h2 className="display text-3xl sm:text-4xl">{titles[step]}</h2>
          {formError ? (
            <div className="mt-5">
              <FormMessage tone="error">{formError}</FormMessage>
            </div>
          ) : null}

          <div className="mt-7">
            {step === 'ride' ? <RideStep draft={draft} patch={patch} errors={errors} config={config} now={now} b={b} /> : null}
            {step === 'vehicle' && quote ? <VehicleStep draft={draft} patch={patch} quote={quote} error={errors.vehicle ? b.vehicle.chooseOne : undefined} b={b} /> : null}
            {step === 'contact' ? <ContactStep draft={draft} patch={patch} errors={errors} mode={authMode} onMode={setAuthMode} b={b} /> : null}
            {step === 'review' && quote && selected ? <ReviewStep draft={draft} quote={quote} option={selected} onEdit={goTo} b={b} /> : null}
            {step === 'payment' ? <PaymentStep draft={draft} patch={patch} config={config} accepted={accepted} onAccept={(value) => { setAccepted(value); setErrors({}) }} errors={errors} b={b} priceOnRequest={selected?.totalCents === null} /> : null}
          </div>

          <div className="mt-9 flex flex-wrap items-center justify-between gap-4 border-t border-ink-900/10 pt-6">
            {stepIndex > 0 ? (
              <button type="button" onClick={() => goTo(STEP_ORDER[stepIndex - 1] ?? 'ride')} className="inline-flex items-center gap-2 text-sm font-medium text-ink-900/60 hover:text-ink-900">
                <ArrowLeft aria-hidden className="size-4" />
                {t.actions.back}
              </button>
            ) : (
              <span />
            )}
            {gated ? null : (
              <Button size="lg" variant={step === 'payment' ? 'gold' : 'dark'} arrow loading={busy || redirecting} onClick={next} data-testid="wizard-next">
                {primaryLabel}
              </Button>
            )}
          </div>
        </div>
        <p className="mt-4 text-xs text-ink-900/60">{b.saved}</p>
      </div>

      <Summary draft={draft} quote={quote} selected={selected} b={b} />
    </div>
  )
}

/* ---------------------------------------------------------------- Summary */

function Summary({ draft, quote, selected, b }: { draft: Draft; quote: Quote | null; selected?: QuoteOption; b: BookingMessages }) {
  const { t, locale } = useI18n()
  const s = b.summary
  const hasRoute = Boolean(draft.pickup && (draft.dropoff || draft.rideType === 'hourly'))
  // A return is priced as two journeys: its distance and time are for each of them.
  const eachWay = (value: string) => (quote?.rideType === 'return' ? fill(b.vehicle.eachWay, { value }) : value)

  const row = (label: string, value: string | null | undefined) =>
    value ? (
      <div className="flex justify-between gap-4 py-2.5">
        <dt className="shrink-0 text-bone-100/55">{label}</dt>
        <dd className="text-right font-medium text-bone-50">{value}</dd>
      </div>
    ) : null

  return (
    <aside aria-label={s.title} className="lg:sticky lg:top-28 lg:self-start">
      <div className="on-dark grain overflow-hidden rounded-lg bg-ink-950 p-6 text-sm text-bone-100 sm:p-7">
        <h2 className="eyebrow text-gold-300">{s.title}</h2>

        {hasRoute ? (
          <>
            <ol className="mt-6 space-y-4">
              <li className="relative pl-6">
                <span aria-hidden className="absolute left-0 top-1.5 size-2.5 rounded-full border border-gold-300" />
                <span aria-hidden className="absolute left-[0.28rem] top-5 h-[calc(100%+0.25rem)] w-px bg-gradient-to-b from-gold-300/60 to-gold-300/10" />
                <span className="block text-xs text-bone-100/55">{b.review.from}</span>
                <span className="block font-medium text-bone-50">{draft.pickup?.label}</span>
              </li>
              <li className="relative pl-6">
                <span aria-hidden className="absolute left-0 top-1.5 size-2.5 rounded-full bg-gold-300" />
                <span className="block text-xs text-bone-100/55">{b.review.to}</span>
                <span className="block font-medium text-bone-50">{draft.dropoff?.label ?? b.review.asDirected}</span>
              </li>
            </ol>

            <dl className="mt-6 divide-y divide-white/10 border-y border-white/10">
              {row(b.review.type, t.rideTypes[draft.rideType])}
              {row(b.review.when, formatFormDateTime(draft.date, draft.time, locale))}
              {draft.rideType === 'return' ? row(b.review.returnWhen, formatFormDateTime(draft.returnDate, draft.returnTime, locale)) : null}
              {draft.rideType === 'hourly' ? row(b.review.duration, fill(t.units.hours, { count: draft.hours })) : null}
              {row(b.review.passengers, `${formatPassengers(draft.adults + draft.children, t)} · ${formatBags(draft.luggage, t)}`)}
              {quote?.route ? row(s.distance, `${eachWay(formatDistance(quote.route.distanceM, t))}${quote.route.source === 'estimate' ? ` (${s.estimated})` : ''}`) : null}
              {quote?.route ? row(s.duration, `${t.units.approx} ${eachWay(formatDuration(quote.route.durationS, t))}`) : null}
              {row(b.review.vehicle, selected?.vehicle.name)}
            </dl>

            <div className="mt-6 flex items-end justify-between gap-4">
              <div>
                <p className="text-bone-100/55">{s.price}</p>
                {selected ? <p className="text-xs text-bone-100/55">{s.includes}</p> : null}
              </div>
              {selected && quote ? (
                <p className="font-display text-4xl text-bone-50" data-testid="summary-price">
                  {formatPrice(selected.totalCents, quote.currency, locale, t.payment.onRequest)}
                </p>
              ) : (
                <p className="max-w-[11rem] text-right text-xs text-bone-100/55">{s.pricePending}</p>
              )}
            </div>
          </>
        ) : (
          <p className="mt-5 leading-relaxed text-bone-100/55">{s.empty}</p>
        )}

        <ul className="mt-7 space-y-2.5 border-t border-white/10 pt-6 text-xs text-bone-100/60">
          {s.promises.map((promise) => (
            <li key={promise} className="flex items-start gap-2.5">
              <Check aria-hidden className="mt-0.5 size-3.5 shrink-0 text-gold-300" />
              {promise}
            </li>
          ))}
        </ul>
      </div>
    </aside>
  )
}
