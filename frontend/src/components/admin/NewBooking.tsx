'use client'

import { Check, CircleCheck, Copy, Info, MessageCircle, UserRoundCheck } from 'lucide-react'
import { useEffect, useState } from 'react'
import { BookingDetails } from '@/components/booking/BookingDetails'
import { RideStep, type Errors } from '@/components/booking/steps'
import { Button, ButtonLink } from '@/components/ui/Button'
import { FormMessage, SelectField, TextareaField, TextField } from '@/components/ui/Field'
import { site } from '@/content/site'
import { useI18n } from '@/i18n/client'
import { fill, href, locales, type Locale } from '@/i18n/config'
import type { BookingMessages } from '@/i18n/messages/booking'
import type { ManageMessages } from '@/i18n/messages/manage'
import { api, ApiError, errorMessage, fieldMessage } from '@/lib/api'
import { clearFieldErrors, emptyDraft, normalizeFields, quoteRequest, RIDE_FIELDS, validateRide, type Draft } from '@/lib/booking-draft'
import { whatsappHref } from '@/lib/contact'
import { formatBags, formatDateTime, formatFormDateTime, formatPassengers, formatPrice } from '@/lib/format'
import { useAppConfig } from '@/lib/hooks'
import type { AdminBooking, Quote, SiteSettings } from '@/lib/types'
import { useAdminSummary } from './AdminShell'
import { Card, CardHeader, Lead } from './ui'

interface Props {
  b: BookingMessages
  m: ManageMessages
}

/** The account an email address or phone number belongs to. */
interface Account {
  name: string
  email: string
  phone: string | null
}

const isEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)

function isPhone(value: string): boolean {
  const digits = value.replace(/\D/g, '').length
  return /^\+?[\d\s().-]+$/.test(value) && digits >= 7 && digits <= 15
}

/** A customer needs a name and one way to reach them: a phone number or an email address. */
function validateCustomer(contact: Draft['contact']): Record<string, string> {
  const errors: Record<string, string> = {}
  const name = contact.name.trim()
  const email = contact.email.trim()
  const phone = contact.phone.trim()
  if (name.length < 2) errors['contact.name'] = name ? 'too_short' : 'required'
  if (email && !isEmail(email)) errors['contact.email'] = 'invalid_email'
  if (phone && !isPhone(phone)) errors['contact.phone'] = 'invalid_phone'
  if (!email && !phone) errors['contact.phone'] = 'required'
  return errors
}

/** The text to send the customer: what was booked, and where to follow it. */
function confirmationMessage(booking: AdminBooking, language: Locale, text: ManageMessages['newBooking']['confirmation'], timeZone: string): string {
  const c = text[language]
  const lines = [
    fill(c.hello, { name: booking.contact.name.split(' ')[0] ?? booking.contact.name, brand: site.name }),
    '',
    `${c.reference}: ${booking.reference}`,
    `${c.pickup}: ${formatDateTime(booking.pickupAt, language, timeZone)}`,
    booking.returnAt ? `${c.returnTrip}: ${formatDateTime(booking.returnAt, language, timeZone)}` : null,
    `${c.from}: ${booking.pickup.label}`,
    booking.dropoff ? `${c.to}: ${booking.dropoff.label}` : null,
    booking.hours ? `${c.hours}: ${fill(c.hoursValue, { count: booking.hours })}` : null,
    `${c.vehicle}: ${booking.vehicleName}`,
    `${c.price}: ${formatPrice(booking.totalCents, booking.currency, language, c.onRequest)}`,
    '',
    c.follow,
    `${window.location.origin}${href(language, `/booking/${booking.reference}`)}`,
    booking.guestCode ? `${c.code}: ${booking.guestCode}` : null,
  ]
  return lines.filter((line) => line !== null).join('\n')
}

/**
 * A booking entered for a customer who phoned or wrote on WhatsApp. It is
 * priced like any other, may leave right away, and is confirmed on creation.
 */
export function NewBooking({ b, m }: Props) {
  const { t, locale } = useI18n()
  const config = useAppConfig()
  const { refresh } = useAdminSummary()
  const n = m.newBooking

  const [now] = useState(() => Date.now())
  const [draft, setDraft] = useState<Draft>(emptyDraft)
  const [language, setLanguage] = useState<Locale>(locale)
  const [quote, setQuote] = useState<Quote | null>(null)
  /** The agreed price as typed, in euros. Empty means the calculated price applies. */
  const [price, setPrice] = useState('')
  const [linkAccount, setLinkAccount] = useState(true)
  const [found, setFound] = useState<{ key: string; account: Account | null } | null>(null)
  const [settings, setSettings] = useState<SiteSettings | null>(null)
  const [errors, setErrors] = useState<Errors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [busy, setBusy] = useState<'quote' | 'save' | null>(null)
  const [done, setDone] = useState<{ booking: AdminBooking; account: Account | null; message: string } | null>(null)
  const [copied, setCopied] = useState(false)

  // Whether bookings join the account of a customer who signs up later decides what the form says about that.
  useEffect(() => {
    let active = true
    api<{ settings: SiteSettings }>('/admin/settings')
      .then((result) => {
        if (active) setSettings(result.settings)
      })
      .catch(() => undefined)
    return () => {
      active = false
    }
  }, [])

  // Look up whose account the phone number or email address belongs to, once they are complete.
  const email = draft.contact.email.trim()
  const phone = draft.contact.phone.trim()
  const lookup = new URLSearchParams()
  if (isEmail(email)) lookup.set('email', email)
  if (isPhone(phone)) lookup.set('phone', phone)
  const lookupKey = lookup.toString()
  useEffect(() => {
    if (!lookupKey) return
    let active = true
    const timer = window.setTimeout(() => {
      api<{ account: Account | null }>(`/admin/customers/match?${lookupKey}`)
        .then((result) => {
          if (active) setFound({ key: lookupKey, account: result.account })
        })
        .catch(() => undefined)
    }, 400)
    return () => {
      active = false
      window.clearTimeout(timer)
    }
  }, [lookupKey])
  /** Undefined until the answer for what is typed now has arrived. */
  const account = lookupKey && found?.key === lookupKey ? found.account : undefined

  const selected = quote?.options.find((option) => option.available && option.vehicle.slug === draft.vehicleSlug)
  const agreed = price.trim() === '' ? null : Number(price.replace(',', '.'))
  const agreedValid = agreed === null || (Number.isFinite(agreed) && agreed >= 0 && agreed <= 10_000)
  const totalCents = agreed !== null && agreedValid ? Math.round(agreed * 100) : selected?.totalCents

  const patch = (changes: Partial<Draft>) => {
    setDraft((current) => ({ ...current, ...changes }))
    const keys = Object.keys(changes) as (keyof Draft)[]
    // The journey changed: the prices on screen no longer apply.
    if (keys.some((key) => RIDE_FIELDS.includes(key))) setQuote(null)
    setErrors((current) => clearFieldErrors(current, keys))
  }
  const setContact = (changes: Partial<Draft['contact']>) => patch({ contact: { ...draft.contact, ...changes } })
  const message = (key: string) => fieldMessage(errors[key], t)

  /** Ask the API to price the journey for every vehicle. */
  const requestQuote = async (): Promise<Quote | null> => {
    const invalid = validateRide(draft)
    if (Object.keys(invalid).length > 0) {
      setErrors((current) => ({ ...current, ...invalid }))
      return null
    }
    setBusy('quote')
    setFormError(null)
    try {
      const result = await api<{ quote: Quote }>('/admin/quotes', { method: 'POST', body: quoteRequest(draft) })
      setQuote(result.quote)
      // Keep the chosen vehicle only if it can carry this group.
      if (!result.quote.options.some((option) => option.available && option.vehicle.slug === draft.vehicleSlug)) setDraft((current) => ({ ...current, vehicleSlug: null }))
      return result.quote
    } catch (caught) {
      if (caught instanceof ApiError && caught.code === 'VALIDATION') setErrors((current) => ({ ...current, ...normalizeFields(caught.fields) }))
      else setFormError(errorMessage(caught, t))
      return null
    } finally {
      setBusy(null)
    }
  }

  const create = async (): Promise<void> => {
    const invalid: Errors = { ...validateRide(draft), ...validateCustomer(draft.contact) }
    if (!agreedValid) invalid.priceCents = 'invalid'
    if (Object.keys(invalid).length > 0) {
      setErrors(invalid)
      setFormError(t.errors.VALIDATION)
      return
    }
    if (!quote) {
      // Show the prices first: nothing is saved until the operator has seen them.
      const fresh = await requestQuote()
      if (fresh && !fresh.options.some((option) => option.available && option.vehicle.slug === draft.vehicleSlug)) setErrors({ vehicle: 'required' })
      return
    }
    if (!selected) return setErrors({ vehicle: 'required' })

    setBusy('save')
    setFormError(null)
    setErrors({})
    try {
      const result = await api<{ booking: AdminBooking; account: Account | null }>('/admin/bookings', {
        method: 'POST',
        body: {
          quoteId: quote.id,
          vehicleId: selected.vehicleId,
          contact: draft.contact,
          flightNumber: draft.flightNumber || null,
          priceCents: agreed === null ? null : Math.round(agreed * 100),
          linkAccount,
          locale: language,
        },
      })
      setDone({ ...result, message: confirmationMessage(result.booking, language, n.confirmation, config.timeZone) })
      refresh()
      window.scrollTo({ top: 0 })
    } catch (caught) {
      if (caught instanceof ApiError && (caught.code === 'QUOTE_EXPIRED' || caught.code === 'QUOTE_NOT_FOUND')) {
        // The prices lapsed while the form was open: show the current ones before anything is saved.
        await requestQuote()
        setFormError(t.errors.QUOTE_EXPIRED)
      } else if (caught instanceof ApiError && caught.code === 'VALIDATION') {
        setErrors(normalizeFields(caught.fields))
        setFormError(t.errors.VALIDATION)
      } else {
        setFormError(errorMessage(caught, t))
      }
    } finally {
      setBusy(null)
    }
  }

  const startOver = () => {
    setDraft(emptyDraft())
    setQuote(null)
    setPrice('')
    setLinkAccount(true)
    setErrors({})
    setFormError(null)
    setDone(null)
    setCopied(false)
  }

  /* ---------------------------------------------------------------- Done */

  if (done) {
    const { booking } = done
    // WhatsApp needs the number with its country code.
    const whatsapp = booking.contact.phone && /^\s*(\+|00)/.test(booking.contact.phone) ? booking.contact.phone.replace(/\D/g, '').replace(/^00/, '') : null
    const copy = async () => {
      await navigator.clipboard?.writeText(done.message).catch(() => undefined)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    }
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <Card className="p-6 sm:p-8">
          <span className="flex size-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
            <CircleCheck aria-hidden className="size-6" />
          </span>
          <h2 className="mt-5 text-xl font-semibold tracking-tight">{n.done.title}</h2>
          <p className="mt-1 text-3xl font-semibold tracking-wide" data-testid="booking-reference">
            {booking.reference}
          </p>
          <p className="mt-3 text-sm leading-relaxed text-ink-900/65">
            {n.done.text} {done.account ? fill(n.done.inAccount, { name: done.account.name }) : null}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button variant="dark" onClick={startOver}>
              {n.done.another}
            </Button>
            <ButtonLink href={`/admin/bookings?q=${encodeURIComponent(booking.reference)}`} variant="outline">
              {n.done.list}
            </ButtonLink>
          </div>
        </Card>

        <Card>
          <CardHeader title={n.done.message} hint={n.done.messageHint} />
          <div className="p-5">
            <p className="rounded-lg bg-slate-100 p-4 text-sm leading-relaxed break-words whitespace-pre-wrap text-ink-900/80">{done.message}</p>
            <div className="mt-4 flex flex-wrap gap-3">
              {whatsapp ? (
                <ButtonLink href={whatsappHref(whatsapp, done.message)} variant="dark">
                  <MessageCircle aria-hidden className="size-4" />
                  {n.done.whatsapp}
                </ButtonLink>
              ) : null}
              <Button variant="outline" onClick={copy}>
                {copied ? <Check aria-hidden className="size-4" /> : <Copy aria-hidden className="size-4" />}
                {copied ? n.done.copied : n.done.copy}
              </Button>
            </div>
          </div>
        </Card>

        <Card className="p-5 sm:p-8">
          <BookingDetails booking={booking} b={b} timeZone={config.timeZone} hideCancel />
        </Card>
      </div>
    )
  }

  /* ---------------------------------------------------------------- Form */

  const line = (label: string, value: string | null | undefined) =>
    value ? (
      <div className="flex justify-between gap-4 py-2">
        <dt className="shrink-0 text-ink-900/60">{label}</dt>
        <dd className="min-w-0 text-right font-medium break-words">{value}</dd>
      </div>
    ) : null

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_21rem]">
      <div className="min-w-0 space-y-6">
        <Lead>{n.lead}</Lead>
        {formError ? <FormMessage tone="error">{formError}</FormMessage> : null}

        <Card>
          <CardHeader title={n.customer} hint={n.customerHint} />
          {/* `autoComplete="off"`: the browser must not offer the operator's own details. */}
          <div className="grid gap-5 p-5 sm:grid-cols-2">
            <TextField id="customer-name" label={n.name} autoComplete="off" value={draft.contact.name} onChange={(event) => setContact({ name: event.target.value })} error={message('contact.name')} />
            <TextField
              id="customer-phone"
              type="tel"
              label={n.phone}
              hint={n.phoneHint}
              autoComplete="off"
              inputMode="tel"
              value={draft.contact.phone}
              onChange={(event) => setContact({ phone: event.target.value })}
              error={errors['contact.phone'] === 'required' ? n.contactRequired : message('contact.phone')}
            />
            <TextField id="customer-email" type="email" label={n.email} autoComplete="off" inputMode="email" value={draft.contact.email} onChange={(event) => setContact({ email: event.target.value })} error={message('contact.email')} />
            <TextField id="customer-company" label={n.company} note={n.optional} autoComplete="off" value={draft.contact.company} onChange={(event) => setContact({ company: event.target.value })} error={message('contact.company')} />
            <SelectField id="customer-language" label={n.language} value={language} onChange={(event) => setLanguage(event.target.value as Locale)}>
              {locales.map((option) => (
                <option key={option} value={option}>
                  {n.languages[option]}
                </option>
              ))}
            </SelectField>

            {account ? (
              <div className="col-span-full rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900" data-testid="customer-account">
                <p className="flex items-start gap-2 font-medium">
                  <UserRoundCheck aria-hidden className="mt-0.5 size-4 shrink-0" />
                  {fill(n.account.found, { name: account.name, email: account.email })}
                </p>
                <label className="mt-3 flex items-start gap-3">
                  <input type="checkbox" checked={linkAccount} onChange={(event) => setLinkAccount(event.target.checked)} className="mt-0.5 size-4 shrink-0 accent-emerald-700" />
                  {n.account.link}
                </label>
              </div>
            ) : account === null && settings ? (
              <p className="col-span-full flex items-start gap-2 text-sm leading-relaxed text-ink-900/60" data-testid="customer-account">
                <Info aria-hidden className="mt-0.5 size-4 shrink-0" />
                {settings.linkBookingsOnSignup ? n.account.later : n.account.never}
              </p>
            ) : null}
          </div>
        </Card>

        <Card>
          <CardHeader title={n.ride} />
          <div className="p-5">
            <RideStep draft={draft} patch={patch} errors={errors} config={config} now={now} b={b} byOperator />
          </div>
        </Card>

        <Card>
          <CardHeader title={n.prices} hint={quote ? undefined : n.pricesHint}>
            <Button variant="outline" loading={busy === 'quote'} disabled={busy !== null} onClick={() => void requestQuote()} data-testid="get-prices">
              {quote ? n.refreshPrices : n.getPrices}
            </Button>
          </CardHeader>
          {errors.vehicle ? (
            <p role="alert" className="px-5 pt-4 text-sm text-red-600">
              {n.chooseVehicle}
            </p>
          ) : null}
          {quote ? (
            <div className="space-y-6 p-5">
              <fieldset className="space-y-2">
                <legend className="sr-only">{n.prices}</legend>
                {quote.options.map((option) => {
                  const chosen = option.available && draft.vehicleSlug === option.vehicle.slug
                  return (
                    <label
                      key={option.vehicleId}
                      className={`flex items-center gap-4 rounded-lg border px-4 py-3 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-gold-500 ${
                        !option.available ? 'cursor-not-allowed opacity-50' : chosen ? 'cursor-pointer border-ink-950 bg-slate-50 ring-1 ring-ink-950' : 'cursor-pointer border-ink-900/15 hover:border-ink-900/40'
                      }`}
                    >
                      <input type="radio" name="vehicle" value={option.vehicle.slug} checked={chosen} disabled={!option.available} onChange={() => patch({ vehicleSlug: option.vehicle.slug })} className="size-4 shrink-0 accent-ink-950" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{option.vehicle.name}</span>
                        <span className="block truncate text-xs text-ink-900/60">
                          {fill(m.fleet.seats, { passengers: option.vehicle.passengers, luggage: option.vehicle.luggage })}
                          {option.available ? null : ` · ${n.tooSmall}`}
                        </span>
                      </span>
                      <span className="text-sm font-semibold tabular-nums">{formatPrice(option.totalCents, quote.currency, locale, t.payment.onRequest)}</span>
                    </label>
                  )
                })}
              </fieldset>
              <TextField
                id="agreed-price"
                label={n.agreedPrice}
                note={n.optional}
                hint={n.agreedPriceHint}
                inputMode="decimal"
                autoComplete="off"
                value={price}
                onChange={(event) => {
                  setPrice(event.target.value)
                  setErrors((current) => ({ ...current, priceCents: undefined }))
                }}
                error={message('priceCents')}
                className="sm:max-w-xs"
              />
            </div>
          ) : null}
        </Card>

        <Card className="p-5">
          <TextareaField id="customer-notes" label={n.notes} note={n.optional} placeholder={n.notesPlaceholder} maxLength={1000} value={draft.contact.notes} onChange={(event) => setContact({ notes: event.target.value })} error={message('contact.notes')} />
        </Card>
      </div>

      <aside aria-label={n.summary} className="xl:sticky xl:top-24 xl:self-start">
        <Card>
          <CardHeader title={n.summary} />
          <dl className="divide-y divide-ink-900/10 px-5 py-2 text-sm">
            {line(n.customer, draft.contact.name.trim())}
            {line(b.review.from, draft.pickup?.label)}
            {line(b.review.to, draft.dropoff?.label)}
            {line(b.review.when, formatFormDateTime(draft.date, draft.time, locale))}
            {draft.rideType === 'return' ? line(b.review.returnWhen, formatFormDateTime(draft.returnDate, draft.returnTime, locale)) : null}
            {draft.rideType === 'hourly' ? line(b.review.duration, fill(t.units.hours, { count: draft.hours })) : null}
            {line(b.review.passengers, `${formatPassengers(draft.adults + draft.children, t)} · ${formatBags(draft.luggage, t)}`)}
            {line(b.review.vehicle, selected?.vehicle.name)}
            {agreed !== null && agreedValid && selected && quote ? line(n.calculated, formatPrice(selected.totalCents, quote.currency, locale, t.payment.onRequest)) : null}
          </dl>
          <div className="border-t border-ink-900/10 p-5">
            <div className="flex items-baseline justify-between gap-4">
              <p className="text-sm text-ink-900/60">{n.price}</p>
              <p className="text-2xl font-semibold tracking-tight tabular-nums" data-testid="summary-price">
                {totalCents !== undefined && quote ? formatPrice(totalCents, quote.currency, locale, t.payment.onRequest) : '–'}
              </p>
            </div>
            <Button size="lg" variant="dark" loading={busy === 'save'} disabled={busy !== null} onClick={() => void create()} className="mt-5 w-full" data-testid="create-booking">
              {n.submit}
            </Button>
          </div>
        </Card>
      </aside>
    </div>
  )
}
