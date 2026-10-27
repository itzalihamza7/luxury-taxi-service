'use client'

import { ArrowUpDown, Banknote, Check, CreditCard, Info, LockKeyhole, Luggage, Route, Users } from 'lucide-react'
import { useState, type FormEvent, type ReactNode } from 'react'
import { VehicleImage } from '@/components/art/VehicleArt'
import { useAuth } from '@/components/auth/AuthProvider'
import { Button } from '@/components/ui/Button'
import { FormMessage, SelectField, TextareaField, TextField } from '@/components/ui/Field'
import { Link } from '@/components/ui/Link'
import { useI18n } from '@/i18n/client'
import { fill } from '@/i18n/config'
import type { BookingMessages } from '@/i18n/messages/booking'
import { api, ApiError, errorMessage, fieldMessage } from '@/lib/api'
import type { Draft } from '@/lib/booking-draft'
import { earliestPickup, formatBags, formatDistance, formatDuration, formatFormDateTime, formatPrice, formatPassengers, zonedFormValues } from '@/lib/format'
import { RIDE_TYPES, type AppConfig, type Place, type PlaceKind, type Quote, type QuoteOption, type RideType, type User } from '@/lib/types'
import { Stepper } from './controls'
import { PlaceInput } from './PlaceInput'

export type Errors = Record<string, string | undefined>
type Patch = (changes: Partial<Draft>) => void

const QUICK_PICKS: Record<RideType, PlaceKind[]> = {
  one_way: ['airport', 'station', 'landmark', 'venue'],
  return: ['city', 'landmark', 'airport'],
  local: ['landmark', 'station', 'venue'],
  hourly: ['landmark', 'station', 'airport'],
  city_to_city: ['city', 'station', 'airport'],
  airport: ['airport', 'station', 'landmark'],
}

const isAirport = (place: Place | null) => place?.kind === 'airport'

/* ------------------------------------------------------------------ Step 1 */

export function RideStep({
  draft,
  patch,
  errors,
  config,
  now,
  b,
  byOperator = false,
}: {
  draft: Draft
  patch: Patch
  errors: Errors
  config: AppConfig
  /** The time the form was opened, used to offer sensible pickup shortcuts. */
  now: number
  b: BookingMessages
  /** The business entering a ride for a customer: it may leave right away, so the notice period does not apply. */
  byOperator?: boolean
}) {
  const { t } = useI18n()
  const r = b.ride
  const hourly = draft.rideType === 'hourly'
  const showFlight = draft.rideType === 'airport' || isAirport(draft.pickup) || isAirport(draft.dropoff)
  const message = (key: string) => fieldMessage(errors[key], t)

  // Shortcuts for the pickup time, all in Madrid local time and never sooner than the notice period.
  const leadMinutes = byOperator ? 0 : config.minLeadMinutes + 60
  const soonest = earliestPickup(now, config.timeZone, leadMinutes)
  const today = zonedFormValues(now, config.timeZone).date
  const tomorrow = zonedFormValues(now + 86_400_000, config.timeZone).date
  const quick = [
    { label: byOperator ? r.quick.now : fill(r.quick.inHours, { count: Math.round(leadMinutes / 60) }), ...soonest },
    ...(soonest.date === today && soonest.time < '18:00' ? [{ label: fill(r.quick.today, { time: '18:00' }), date: today, time: '18:00' }] : []),
    { label: fill(r.quick.tomorrow, { time: '09:00' }), date: tomorrow, time: '09:00' },
    { label: fill(r.quick.tomorrow, { time: '18:00' }), date: tomorrow, time: '18:00' },
  ]

  return (
    <div className="space-y-8">
      <fieldset>
        <legend className="mb-3 block text-xs font-semibold tracking-[0.08em] text-ink-900/70 uppercase">{r.type}</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {RIDE_TYPES.map((type) => {
            const selected = draft.rideType === type
            return (
              <label
                key={type}
                className={`relative flex h-12 cursor-pointer items-center justify-center rounded-md border px-3 text-center text-sm font-medium transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-gold-500 ${
                  selected ? 'border-ink-950 bg-ink-950 text-bone-50' : 'border-ink-900/15 bg-white text-ink-900/75 hover:border-ink-900/40'
                }`}
              >
                <input type="radio" name="rideType" value={type} checked={selected} onChange={() => patch({ rideType: type })} className="sr-only" />
                {t.rideTypes[type]}
              </label>
            )
          })}
        </div>
        <p className="mt-3 flex items-start gap-2 text-sm text-ink-900/60">
          <Info aria-hidden className="mt-0.5 size-4 shrink-0 text-gold-600" />
          {r.hints[draft.rideType]}
        </p>
      </fieldset>

      <div className="relative space-y-5">
        <PlaceInput id="pickup" label={r.pickup} value={draft.pickup} onChange={(pickup) => patch({ pickup })} t={r} error={message('pickup')} prefer={QUICK_PICKS[draft.rideType]} />
        <PlaceInput
          id="dropoff"
          label={hourly ? r.dropoffOptional : r.dropoff}
          value={draft.dropoff}
          onChange={(dropoff) => patch({ dropoff })}
          t={r}
          error={message('dropoff')}
          prefer={draft.rideType === 'airport' && !isAirport(draft.pickup) ? ['airport'] : QUICK_PICKS[draft.rideType].filter((kind) => kind !== 'airport' || !isAirport(draft.pickup))}
        />
        {draft.pickup || draft.dropoff ? (
          <button
            type="button"
            onClick={() => patch({ pickup: draft.dropoff, dropoff: draft.pickup })}
            aria-label={r.swap}
            title={r.swap}
            className="absolute right-3 top-[4.6rem] z-10 flex size-9 items-center justify-center rounded-full border border-ink-900/15 bg-white text-ink-900/60 shadow-sm transition-colors hover:border-gold-600 hover:text-gold-700"
          >
            <ArrowUpDown aria-hidden className="size-4" />
          </button>
        ) : null}
      </div>

      <div>
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField id="pickupDate" type="date" label={r.date} value={draft.date} min={today} onChange={(event) => patch({ date: event.target.value })} error={message('pickupDate')} />
          <TextField id="pickupTime" type="time" step={300} label={r.time} value={draft.time} onChange={(event) => patch({ time: event.target.value })} error={message('pickupTime')} />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-xs text-ink-900/60">{r.quick.label}:</span>
          {quick.map((option) => (
            <button
              key={option.label}
              type="button"
              onClick={() => patch({ date: option.date, time: option.time })}
              className="rounded-full border border-ink-900/15 bg-white px-3 py-1.5 text-xs font-medium text-ink-900/70 transition-colors hover:border-gold-600 hover:text-gold-700"
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {draft.rideType === 'return' ? (
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField id="returnDate" type="date" label={r.returnDate} value={draft.returnDate} min={draft.date || today} onChange={(event) => patch({ returnDate: event.target.value })} error={message('returnDate')} />
          <TextField id="returnTime" type="time" step={300} label={r.returnTime} value={draft.returnTime} onChange={(event) => patch({ returnTime: event.target.value })} error={message('returnTime')} />
        </div>
      ) : null}

      {hourly ? (
        <SelectField id="hours" label={r.hours} value={draft.hours} onChange={(event) => patch({ hours: Number(event.target.value) })} error={message('hours')} className="sm:max-w-[calc(50%-0.625rem)]">
          {Array.from({ length: config.limits.maxHours - config.limits.minHours + 1 }, (_, index) => config.limits.minHours + index).map((count) => (
            <option key={count} value={count}>
              {fill(r.hoursOption, { count })}
            </option>
          ))}
        </SelectField>
      ) : null}

      {showFlight ? (
        <TextField
          id="flightNumber"
          label={r.flight}
          note={b.contact.optional}
          hint={r.flightHint}
          placeholder={r.flightPlaceholder}
          value={draft.flightNumber}
          maxLength={12}
          autoCapitalize="characters"
          onChange={(event) => patch({ flightNumber: event.target.value.toUpperCase() })}
          className="sm:max-w-[calc(50%-0.625rem)]"
        />
      ) : null}

      <div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          <Stepper id="adults" label={r.adults} value={draft.adults} min={1} max={config.limits.maxPassengers} onChange={(adults) => patch({ adults })} t={r} />
          <Stepper id="children" label={r.children} value={draft.children} min={0} max={config.limits.maxPassengers - 1} onChange={(children) => patch({ children })} t={r} />
          <Stepper id="luggage" label={r.luggage} value={draft.luggage} min={0} max={config.limits.maxLuggage} onChange={(luggage) => patch({ luggage })} t={r} />
        </div>
        {message('adults') ? (
          <p role="alert" className="mt-3 text-sm text-red-600">
            {message('adults')}
          </p>
        ) : null}
      </div>

      <p className="text-xs leading-relaxed text-ink-900/60">
        {r.timezone} {byOperator ? null : r.notice}
      </p>
    </div>
  )
}

/* ------------------------------------------------------------------ Step 2 */

function reason(option: QuoteOption, draft: Draft, b: BookingMessages): string | null {
  if (option.available) return null
  return option.reason === 'luggage' ? fill(b.vehicle.tooSmallLuggage, { count: draft.luggage }) : fill(b.vehicle.tooSmallPassengers, { count: draft.adults + draft.children })
}

/** What the prices are for: the kind of ride, the road distance and drive time (each way for a return), or the hours. */
function journeyFacts(quote: Quote, b: BookingMessages, t: ReturnType<typeof useI18n>['t']): string[] {
  const eachWay = (value: string) => (quote.rideType === 'return' ? fill(b.vehicle.eachWay, { value }) : value)
  const facts = [t.rideTypes[quote.rideType]]
  if (quote.route) {
    const estimated = quote.route.source === 'estimate' ? ` (${b.summary.estimated})` : ''
    facts.push(`${eachWay(formatDistance(quote.route.distanceM, t))}${estimated}`, `${t.units.approx} ${eachWay(formatDuration(quote.route.durationS, t))}`)
  }
  if (quote.rideType === 'hourly' && quote.hours) facts.push(fill(b.ride.hoursOption, { count: quote.hours }))
  return facts
}

export function VehicleStep({ draft, patch, quote, error, b }: { draft: Draft; patch: Patch; quote: Quote; error?: string; b: BookingMessages }) {
  const { t, locale } = useI18n()
  const anyAvailable = quote.options.some((option) => option.available)

  return (
    <div>
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-md bg-bone-100 px-4 py-3 text-sm text-ink-900">
        <Route aria-hidden className="size-4 shrink-0 text-gold-600" />
        <span className="font-semibold">{b.vehicle.journey}:</span>
        <span>{journeyFacts(quote, b, t).join(' · ')}</span>
      </p>
      <p className="mt-4 text-sm leading-relaxed text-ink-900/60">{b.vehicle.lead}</p>
      {!anyAvailable ? (
        <div className="mt-6">
          <FormMessage tone="error">{b.vehicle.none}</FormMessage>
        </div>
      ) : null}
      {error ? (
        <p role="alert" className="mt-4 text-sm text-red-600">
          {error}
        </p>
      ) : null}

      <fieldset className="mt-6 space-y-3">
        <legend className="sr-only">{b.vehicle.title}</legend>
        {quote.options.map((option) => {
          const { vehicle } = option
          const selected = option.available && draft.vehicleSlug === vehicle.slug
          const why = reason(option, draft, b)
          return (
            <label
              key={option.vehicleId}
              className={`relative grid cursor-pointer grid-cols-[5.5rem_1fr] items-center gap-4 rounded-md border bg-white p-4 transition-all has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-gold-500 sm:grid-cols-[9rem_1fr_auto] sm:gap-6 sm:p-5 ${
                !option.available ? 'cursor-not-allowed opacity-55' : selected ? 'border-ink-950 shadow-[0_12px_32px_-16px_rgba(12,18,27,0.45)]' : 'border-ink-900/15 hover:border-ink-900/40'
              }`}
            >
              <input
                type="radio"
                name="vehicle"
                value={vehicle.slug}
                checked={selected}
                disabled={!option.available}
                onChange={() => patch({ vehicleSlug: vehicle.slug })}
                className="sr-only"
              />
              <VehicleImage bodyType={vehicle.bodyType} imageUrl={vehicle.imageUrl} name="" sizes="144px" className="aspect-[16/10] w-full rounded text-ink-900" />

              <div className="min-w-0">
                <p className="eyebrow text-gold-700">{vehicle.tagline[locale]}</p>
                <p className="mt-1 font-display text-xl leading-tight sm:text-2xl">{vehicle.name}</p>
                <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-900/60">
                  <li className="inline-flex items-center gap-1.5">
                    <Users aria-hidden className="size-3.5" />
                    {fill(t.units.upToPassengers, { count: vehicle.passengers })}
                  </li>
                  <li className="inline-flex items-center gap-1.5">
                    <Luggage aria-hidden className="size-3.5" />
                    {fill(t.units.upToBags, { count: vehicle.luggage })}
                  </li>
                </ul>
                {why ? <p className="mt-2 text-xs font-medium text-red-700">{why}</p> : <p className="mt-2 hidden text-xs leading-relaxed text-ink-900/60 sm:block">{vehicle.highlights[locale][0]}</p>}
              </div>

              <div className="col-span-2 flex items-center justify-between gap-4 border-t border-ink-900/10 pt-3 sm:col-span-1 sm:flex-col sm:items-end sm:border-0 sm:pt-0">
                <p className="font-display text-3xl">{formatPrice(option.totalCents, quote.currency, locale, t.payment.onRequest)}</p>
                <span
                  className={`inline-flex h-9 items-center gap-1.5 rounded-full px-4 text-xs font-semibold ${
                    selected ? 'bg-ink-950 text-gold-300' : option.available ? 'border border-ink-900/20 text-ink-900' : 'text-ink-900/60'
                  }`}
                >
                  {selected ? <Check aria-hidden className="size-3.5" /> : null}
                  {selected ? b.vehicle.selected : option.available ? b.vehicle.select : null}
                </span>
              </div>
            </label>
          )
        })}
      </fieldset>
    </div>
  )
}

/* ------------------------------------------------------------------ Step 3 */

export type AuthMode = 'guest' | 'signin' | 'register'

/** Fill empty contact fields from the signed-in customer's profile. */
export function withProfile(contact: Draft['contact'], user: User | null): Draft['contact'] {
  if (!user) return contact
  return { ...contact, name: contact.name || user.name, email: contact.email || user.email, phone: contact.phone || (user.phone ?? '') }
}

export function ContactStep({
  draft,
  patch,
  errors,
  mode,
  onMode,
  b,
}: {
  draft: Draft
  patch: Patch
  errors: Errors
  /** Guests fill in the contact fields; the other two modes show a sign-in or registration form first. */
  mode: AuthMode
  onMode: (mode: AuthMode) => void
  b: BookingMessages
}) {
  const { t } = useI18n()
  const { user, setUser, signOut } = useAuth()
  const c = b.contact
  const [credentials, setCredentials] = useState({ email: '', password: '' })
  const [authErrors, setAuthErrors] = useState<Errors>({})
  const [authError, setAuthError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const setContact = (changes: Partial<Draft['contact']>) => patch({ contact: { ...draft.contact, ...changes } })
  const message = (key: string) => fieldMessage(errors[key], t)

  const authenticate = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setAuthError(null)
    setAuthErrors({})
    try {
      const body =
        mode === 'signin'
          ? { email: credentials.email, password: credentials.password }
          : { name: draft.contact.name, email: draft.contact.email, phone: draft.contact.phone, password: credentials.password }
      const result = await api<{ user: User }>(mode === 'signin' ? '/auth/login' : '/auth/register', { method: 'POST', body })
      setUser(result.user)
      patch({ contact: withProfile(draft.contact, result.user) })
      onMode('guest')
    } catch (caught) {
      if (caught instanceof ApiError && caught.code === 'VALIDATION') setAuthErrors(caught.fields)
      else setAuthError(errorMessage(caught, t))
    } finally {
      setBusy(false)
    }
  }

  const tabs: { id: AuthMode; title: string; text: string }[] = [
    { id: 'guest', title: c.guest, text: c.guestText },
    { id: 'signin', title: c.signIn, text: c.signInText },
    { id: 'register', title: c.register, text: c.registerText },
  ]

  const nameField = (
    <TextField id="contact-name" label={c.name} autoComplete="name" value={draft.contact.name} onChange={(event) => setContact({ name: event.target.value })} error={message('contact.name') ?? fieldMessage(authErrors.name, t)} />
  )
  const emailField = (
    <TextField
      id="contact-email"
      type="email"
      label={c.email}
      hint={user ? undefined : c.emailHint}
      autoComplete="email"
      inputMode="email"
      value={draft.contact.email}
      onChange={(event) => setContact({ email: event.target.value })}
      error={message('contact.email') ?? fieldMessage(authErrors.email, t)}
    />
  )
  const phoneField = (
    <TextField
      id="contact-phone"
      type="tel"
      label={c.phone}
      hint={c.phoneHint}
      placeholder={c.phonePlaceholder}
      autoComplete="tel"
      inputMode="tel"
      value={draft.contact.phone}
      onChange={(event) => setContact({ phone: event.target.value })}
      error={message('contact.phone') ?? fieldMessage(authErrors.phone, t)}
    />
  )

  return (
    <div className="space-y-7">
      {user ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-bone-100 px-5 py-4">
          <p className="flex items-center gap-2.5 text-sm font-medium">
            <span className="flex size-7 items-center justify-center rounded-full bg-ink-950 text-xs text-gold-300">{user.name.charAt(0).toUpperCase()}</span>
            {fill(c.signedInAs, { name: user.name })}
          </p>
          <button type="button" onClick={() => void signOut()} className="text-sm text-ink-900/60 underline-offset-4 hover:text-ink-900 hover:underline">
            {c.notYou}
          </button>
        </div>
      ) : (
        <div role="tablist" aria-label={c.title} className="grid gap-2 sm:grid-cols-3">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={mode === tab.id}
              onClick={() => {
                onMode(tab.id)
                setAuthError(null)
                setAuthErrors({})
              }}
              className={`rounded-md border p-4 text-left transition-colors ${mode === tab.id ? 'border-ink-950 bg-ink-950 text-bone-50' : 'border-ink-900/15 bg-white hover:border-ink-900/40'}`}
            >
              <span className="block text-sm font-semibold">{tab.title}</span>
              <span className={`mt-1 block text-xs leading-relaxed ${mode === tab.id ? 'text-bone-100/65' : 'text-ink-900/60'}`}>{tab.text}</span>
            </button>
          ))}
        </div>
      )}

      {!user && mode === 'signin' ? (
        <form onSubmit={authenticate} className="space-y-5" noValidate>
          <TextField id="signin-email" type="email" label={c.email} autoComplete="email" value={credentials.email} onChange={(event) => setCredentials({ ...credentials, email: event.target.value })} error={fieldMessage(authErrors.email, t)} />
          <TextField id="signin-password" type="password" label={c.password} autoComplete="current-password" value={credentials.password} onChange={(event) => setCredentials({ ...credentials, password: event.target.value })} error={fieldMessage(authErrors.password, t)} />
          {authError ? <FormMessage tone="error">{authError}</FormMessage> : null}
          <Button type="submit" variant="dark" loading={busy}>
            {c.signInSubmit}
          </Button>
        </form>
      ) : !user && mode === 'register' ? (
        <form onSubmit={authenticate} className="space-y-5" noValidate>
          <div className="grid gap-5 sm:grid-cols-2">
            {nameField}
            {emailField}
            {phoneField}
            <TextField
              id="register-password"
              type="password"
              label={c.password}
              hint={c.passwordHint}
              autoComplete="new-password"
              value={credentials.password}
              onChange={(event) => setCredentials({ ...credentials, password: event.target.value })}
              error={authErrors.password ? (authErrors.password === 'too_short' ? t.fields.password_short : fieldMessage(authErrors.password, t)) : undefined}
            />
          </div>
          {authError ? <FormMessage tone="error">{authError}</FormMessage> : null}
          <Button type="submit" variant="dark" loading={busy}>
            {c.registerSubmit}
          </Button>
        </form>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2">
          {nameField}
          {emailField}
          {phoneField}
          <TextField id="contact-company" label={c.company} note={c.optional} autoComplete="organization" value={draft.contact.company} onChange={(event) => setContact({ company: event.target.value })} error={message('contact.company')} />
          <TextareaField
            id="contact-notes"
            label={c.notes}
            note={c.optional}
            placeholder={c.notesPlaceholder}
            maxLength={1000}
            value={draft.contact.notes}
            onChange={(event) => setContact({ notes: event.target.value })}
            error={message('contact.notes')}
            className="sm:col-span-2"
          />
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ Step 4 */

function ReviewBlock({ title, onEdit, children }: { title: string; onEdit: () => void; children: ReactNode }) {
  const { t } = useI18n()
  return (
    <section className="border-b border-ink-900/10 py-6 first:pt-0 last:border-0">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="eyebrow text-gold-700">{title}</h3>
        <button type="button" onClick={onEdit} className="text-sm font-medium text-ink-900/60 underline-offset-4 hover:text-ink-900 hover:underline">
          {t.actions.edit}
        </button>
      </div>
      {children}
    </section>
  )
}

function Line({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[6.5rem_1fr] gap-4 py-1.5 sm:grid-cols-[9rem_1fr]">
      <dt className="text-sm text-ink-900/60">{label}</dt>
      <dd className="text-sm font-medium break-words">{children}</dd>
    </div>
  )
}

export function ReviewStep({
  draft,
  quote,
  option,
  onEdit,
  b,
}: {
  draft: Draft
  quote: Quote
  option: QuoteOption
  onEdit: (step: 'ride' | 'vehicle' | 'contact') => void
  b: BookingMessages
}) {
  const { t, locale } = useI18n()
  const r = b.review
  return (
    <div>
      <p className="mb-6 text-sm text-ink-900/60">{r.lead}</p>
      <ReviewBlock title={r.ride} onEdit={() => onEdit('ride')}>
        <dl>
          <Line label={r.type}>{t.rideTypes[draft.rideType]}</Line>
          <Line label={r.from}>{draft.pickup?.label}</Line>
          <Line label={r.to}>{draft.dropoff?.label ?? r.asDirected}</Line>
          <Line label={r.when}>{formatFormDateTime(draft.date, draft.time, locale)}</Line>
          {draft.rideType === 'return' ? <Line label={r.returnWhen}>{formatFormDateTime(draft.returnDate, draft.returnTime, locale)}</Line> : null}
          {draft.rideType === 'hourly' ? <Line label={r.duration}>{fill(t.units.hours, { count: draft.hours })}</Line> : null}
          {draft.flightNumber ? <Line label={r.flight}>{draft.flightNumber}</Line> : null}
          <Line label={r.passengers}>
            {formatPassengers(draft.adults + draft.children, t)} · {formatBags(draft.luggage, t)}
          </Line>
        </dl>
      </ReviewBlock>

      <ReviewBlock title={r.vehicle} onEdit={() => onEdit('vehicle')}>
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-display text-2xl">{option.vehicle.name}</p>
            <p className="text-sm text-ink-900/60">{option.vehicle.tagline[locale]}</p>
          </div>
          <p className="font-display text-3xl">{formatPrice(option.totalCents, quote.currency, locale, t.payment.onRequest)}</p>
        </div>
      </ReviewBlock>

      <ReviewBlock title={r.contact} onEdit={() => onEdit('contact')}>
        <dl>
          <Line label={b.contact.name}>{draft.contact.name}</Line>
          <Line label={b.contact.email}>{draft.contact.email}</Line>
          <Line label={b.contact.phone}>{draft.contact.phone}</Line>
          {draft.contact.company ? <Line label={r.company}>{draft.contact.company}</Line> : null}
          {draft.contact.notes ? <Line label={r.notes}>{draft.contact.notes}</Line> : null}
        </dl>
      </ReviewBlock>
    </div>
  )
}

/* ------------------------------------------------------------------ Step 5 */

export function PaymentStep({
  draft,
  patch,
  config,
  accepted,
  onAccept,
  errors,
  b,
  priceOnRequest = false,
}: {
  draft: Draft
  patch: Patch
  config: AppConfig
  accepted: boolean
  onAccept: (value: boolean) => void
  /** The chosen ride has no price yet: it is agreed with the business after booking. */
  priceOnRequest?: boolean
  errors: Errors
  b: BookingMessages
}) {
  const { t } = useI18n()
  const p = b.payment
  const method = config.onlinePayments ? draft.paymentMethod : 'chauffeur'
  const [before, afterTerms] = p.terms.split('{terms}')
  const [between, after] = (afterTerms ?? '').split('{privacy}')

  const option = (value: 'chauffeur' | 'online', title: string, text: string, icon: ReactNode, disabled = false) => {
    const selected = method === value
    return (
      <label
        className={`relative flex items-start gap-4 rounded-md border bg-white p-5 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-gold-500 ${
          disabled ? 'cursor-not-allowed opacity-55' : 'cursor-pointer'
        } ${selected ? 'border-ink-950 shadow-[0_12px_32px_-16px_rgba(12,18,27,0.45)]' : 'border-ink-900/15 hover:border-ink-900/40'}`}
      >
        <input type="radio" name="paymentMethod" value={value} checked={selected} disabled={disabled} onChange={() => patch({ paymentMethod: value })} className="sr-only" />
        <span className={`flex size-11 shrink-0 items-center justify-center rounded-full ${selected ? 'bg-ink-950 text-gold-300' : 'bg-bone-100 text-ink-900/60'}`}>{icon}</span>
        <span>
          <span className="block font-semibold">{title}</span>
          <span className="mt-1 block text-sm leading-relaxed text-ink-900/60">{text}</span>
        </span>
      </label>
    )
  }

  return (
    <div className="space-y-6">
      {config.onlinePayments && !priceOnRequest ? (
        <fieldset className="space-y-3">
          <legend className="sr-only">{p.title}</legend>
          {option('chauffeur', p.chauffeur, p.chauffeurText, <Banknote aria-hidden className="size-5" />)}
          {option('online', p.online, p.onlineText, <CreditCard aria-hidden className="size-5" />)}
        </fieldset>
      ) : (
        // Paid through a secure link the team sends once they have checked the ride.
        <div className="rounded-md border border-ink-900/15 bg-white p-5 sm:p-6">
          <p className="flex items-center gap-2 font-semibold">
            <CreditCard aria-hidden className="size-5 text-gold-600" />
            {p.howTitle}
          </p>
          <ol className="mt-4 space-y-3">
            {p.howSteps.map((text, index) => (
              <li key={text} className="flex gap-3 text-sm leading-relaxed text-ink-900/70">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-ink-950 text-xs font-semibold text-gold-300">{index + 1}</span>
                {text}
              </li>
            ))}
          </ol>
          {priceOnRequest ? <p className="mt-4 rounded-md bg-bone-100 px-3 py-2 text-sm text-ink-900/75">{p.howOnRequest}</p> : null}
        </div>
      )}

      <p className="flex items-center gap-2 text-xs text-ink-900/60">
        <LockKeyhole aria-hidden className="size-3.5 text-gold-600" />
        {p.secure}
      </p>

      <div>
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={accepted}
            onChange={(event) => onAccept(event.target.checked)}
            aria-invalid={errors.acceptTerms ? true : undefined}
            aria-describedby={errors.acceptTerms ? 'terms-error' : undefined}
            className="mt-0.5 size-5 shrink-0 accent-gold-600"
          />
          <span className="text-sm leading-relaxed text-ink-900/75">
            {before}
            <Link href="/legal/terms" target="_blank" className="font-medium text-ink-900 underline decoration-gold-600/50 underline-offset-4 hover:decoration-gold-600">
              {p.termsLink}
            </Link>
            {between}
            <Link href="/legal/privacy" target="_blank" className="font-medium text-ink-900 underline decoration-gold-600/50 underline-offset-4 hover:decoration-gold-600">
              {p.privacyLink}
            </Link>
            {after}
          </span>
        </label>
        {errors.acceptTerms ? (
          <p id="terms-error" role="alert" className="mt-2 pl-8 text-sm text-red-600">
            {fieldMessage(errors.acceptTerms, t)}
          </p>
        ) : null}
      </div>
    </div>
  )
}
