'use client'

import { ArrowRight, ChevronDown, LogOut, MailCheck, PlusCircle } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState, type FormEvent } from 'react'
import { useAuth } from '@/components/auth/AuthProvider'
import { BookingDetails, StatusBadge } from '@/components/booking/BookingDetails'
import { Button, ButtonLink } from '@/components/ui/Button'
import { FormMessage, TextField } from '@/components/ui/Field'
import { Link } from '@/components/ui/Link'
import { Accent } from '@/components/ui/Section'
import { useI18n } from '@/i18n/client'
import { fill, href } from '@/i18n/config'
import type { AccountMessages } from '@/i18n/messages/account'
import type { BookingMessages } from '@/i18n/messages/booking'
import { api, ApiError, errorMessage, fieldMessage } from '@/lib/api'
import { formatDateTime, formatPrice } from '@/lib/format'
import { useAppConfig, useHydrated } from '@/lib/hooks'
import type { Booking, User } from '@/lib/types'

interface Props {
  a: AccountMessages['account']
  b: BookingMessages
}

export function AccountDashboard(props: Props) {
  const placeholder = <div aria-busy="true" className="h-96 animate-pulse rounded-lg bg-ink-900/5" />
  return useHydrated() ? (
    <Suspense fallback={placeholder}>
      <Dashboard {...props} />
    </Suspense>
  ) : (
    placeholder
  )
}

function Dashboard({ a, b }: Props) {
  const { t, locale } = useI18n()
  const { user, ready, signOut } = useAuth()
  const router = useRouter()
  const config = useAppConfig()
  const [now] = useState(() => Date.now())
  // The address says which tab is open, so the account menu can link straight to "My details".
  const searchParams = useSearchParams()
  const tab = searchParams.get('tab') === 'profile' ? 'profile' : 'bookings'
  const setTab = (next: 'bookings' | 'profile') => window.history.replaceState(null, '', next === 'profile' ? `${window.location.pathname}?tab=profile` : window.location.pathname)
  /** Bookings taken by phone that joined the account when it was created. */
  const linked = Number(searchParams.get('linked')) || 0
  const [bookings, setBookings] = useState<Booking[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [openReference, setOpenReference] = useState<string | null>(null)
  /** Bookings that joined the account just now, by email verification or with a guest code. */
  const [joined, setJoined] = useState<string | null>(null)

  // Signed-out visitors are sent to sign in, and brought back here afterwards.
  useEffect(() => {
    if (ready && !user) router.replace(`${href(locale, '/login')}?next=/account`)
  }, [ready, user, router, locale])

  useEffect(() => {
    if (!user) return
    let active = true
    api<{ bookings: Booking[] }>('/bookings')
      .then((result) => {
        if (active) setBookings(result.bookings)
      })
      .catch((caught) => {
        if (active) setError(errorMessage(caught, t))
      })
    return () => {
      active = false
    }
  }, [user, t])

  if (!user) return <p className="py-16 text-center text-sm text-ink-900/60">{a.checking}</p>

  const isUpcoming = (booking: Booking) => ['pending', 'confirmed', 'in_progress'].includes(booking.status) && new Date(booking.pickupAt).getTime() > now - 6 * 3_600_000
  const upcoming = (bookings ?? []).filter(isUpcoming).sort((x, y) => x.pickupAt.localeCompare(y.pickupAt))
  const past = (bookings ?? []).filter((booking) => !isUpcoming(booking))

  const replace = (updated: Booking) => setBookings((current) => (current ?? []).map((booking) => (booking.reference === updated.reference ? updated : booking)))

  const list = (items: Booking[]) => (
    <ul className="space-y-3">
      {items.map((booking) => {
        const open = openReference === booking.reference
        return (
          <li key={booking.reference} className="overflow-hidden rounded-md border border-ink-900/10 bg-white">
            <button
              type="button"
              onClick={() => setOpenReference(open ? null : booking.reference)}
              aria-expanded={open}
              className="grid w-full gap-3 p-5 text-left transition-colors hover:bg-bone-100/60 sm:grid-cols-[1fr_auto] sm:items-center sm:gap-6"
            >
              <span>
                <span className="flex flex-wrap items-center gap-3">
                  <span className="font-display text-xl tracking-wide">{booking.reference}</span>
                  <StatusBadge status={booking.status} />
                </span>
                <span className="mt-2 block text-sm font-medium">{formatDateTime(booking.pickupAt, locale, config.timeZone)}</span>
                <span className="mt-1 block truncate text-sm text-ink-900/60">
                  {booking.pickup.label} {booking.dropoff ? `→ ${booking.dropoff.label}` : ''}
                </span>
              </span>
              <span className="flex items-center justify-between gap-5 sm:justify-end">
                <span className="font-display text-2xl">{formatPrice(booking.totalCents, booking.currency, locale, t.payment.onRequest)}</span>
                <span className="inline-flex items-center gap-1 text-sm text-ink-900/60">
                  {open ? a.hide : a.view}
                  <ChevronDown aria-hidden className={`size-4 transition-transform ${open ? 'rotate-180' : ''}`} />
                </span>
              </span>
            </button>
            {open ? (
              <div className="border-t border-ink-900/10 p-5 sm:p-8">
                <BookingDetails booking={booking} b={b} timeZone={config.timeZone} onChange={replace} />
                <Link href={`/booking/${booking.reference}`} className="mt-6 inline-flex items-center gap-2 text-sm font-medium underline decoration-gold-600/50 underline-offset-4 hover:decoration-gold-600">
                  {b.details.openPage}
                  <ArrowRight aria-hidden className="size-4" />
                </Link>
              </div>
            ) : null}
          </li>
        )
      })}
    </ul>
  )

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <h2 className="display text-4xl sm:text-5xl">
            <Accent text={fill(a.title, { name: user.name.split(' ')[0] ?? user.name })} />
          </h2>
          <p className="mt-2 text-ink-900/60">{a.lead}</p>
        </div>
        <ButtonLink href="/booking" variant="dark" arrow>
          {a.newBooking}
        </ButtonLink>
      </div>

      <div role="tablist" className="mt-9 flex gap-1 border-b border-ink-900/10">
        {(['bookings', 'profile'] as const).map((id) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`-mb-px border-b-2 px-4 py-3 text-sm font-medium transition-colors ${tab === id ? 'border-gold-600 text-ink-900' : 'border-transparent text-ink-900/60 hover:text-ink-900'}`}
          >
            {a.tabs[id]}
          </button>
        ))}
      </div>

      {linked > 0 && tab === 'bookings' ? (
        <div className="mt-8">
          <FormMessage tone="success">{linked === 1 ? a.linkedOne : fill(a.linkedMany, { count: linked })}</FormMessage>
        </div>
      ) : null}
      {joined && tab === 'bookings' ? (
        <div className="mt-8">
          <FormMessage tone="success">{joined}</FormMessage>
        </div>
      ) : null}
      {tab === 'bookings' && !user.emailVerified ? (
        <VerifyEmail user={user} a={a} onVerified={(count) => setJoined(count === 0 ? a.verified : count === 1 ? `${a.verified} ${a.linkedOne}` : `${a.verified} ${fill(a.linkedMany, { count })}`)} />
      ) : null}

      <div className="mt-8">
        {tab === 'profile' ? (
          <Profile user={user} a={a} onSignOut={signOut} />
        ) : error ? (
          <FormMessage tone="error">{error}</FormMessage>
        ) : bookings === null ? (
          <p className="py-10 text-sm text-ink-900/60">{t.loading}</p>
        ) : bookings.length === 0 ? (
          <div className="rounded-md border border-dashed border-ink-900/20 px-6 py-14 text-center">
            <p className="text-ink-900/65">{a.empty}</p>
            <ButtonLink href="/booking" arrow className="mt-6">
              {a.emptyCta}
            </ButtonLink>
          </div>
        ) : (
          <div className="space-y-10">
            {upcoming.length > 0 ? (
              <section>
                <h3 className="eyebrow mb-4 text-gold-700">{a.upcoming}</h3>
                {list(upcoming)}
              </section>
            ) : null}
            {past.length > 0 ? (
              <section>
                <h3 className="eyebrow mb-4 text-ink-900/60">{a.past}</h3>
                {list(past)}
              </section>
            ) : null}
          </div>
        )}
        {tab === 'bookings' && bookings !== null ? (
          <AddBooking
            a={a}
            onAdded={(booking) => {
              setBookings((current) => [booking, ...(current ?? []).filter((item) => item.reference !== booking.reference)])
              setJoined(fill(a.added, { reference: booking.reference }))
            }}
          />
        ) : null}
      </div>
    </div>
  )
}

function Profile({ user, a, onSignOut }: { user: User; a: AccountMessages['account']; onSignOut: () => Promise<void> }) {
  const { t } = useI18n()
  const { setUser } = useAuth()
  const [form, setForm] = useState({ name: user.name, phone: user.phone ?? '' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [message, setMessage] = useState<{ tone: 'error' | 'success'; text: string } | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setMessage(null)
    setErrors({})
    try {
      const result = await api<{ user: User }>('/auth/me', { method: 'PATCH', body: form })
      setUser(result.user)
      setMessage({ tone: 'success', text: a.saved })
    } catch (caught) {
      if (caught instanceof ApiError && caught.code === 'VALIDATION') setErrors(caught.fields)
      else setMessage({ tone: 'error', text: errorMessage(caught, t) })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <form onSubmit={submit} noValidate className="space-y-5 rounded-md border border-ink-900/10 bg-white p-6 sm:p-8">
        <div>
          <h3 className="font-display text-2xl">{a.profileTitle}</h3>
          <p className="mt-1 text-sm text-ink-900/60">{a.profileText}</p>
        </div>
        <TextField id="profile-name" label={a.name} autoComplete="name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} error={fieldMessage(errors.name, t)} />
        <TextField id="profile-email" type="email" label={a.email} value={user.email} hint={a.emailFixed} disabled readOnly />
        <TextField id="profile-phone" type="tel" label={a.phone} autoComplete="tel" inputMode="tel" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} error={fieldMessage(errors.phone, t)} />
        {message ? <FormMessage tone={message.tone}>{message.text}</FormMessage> : null}
        <Button type="submit" variant="dark" loading={busy}>
          {t.actions.save}
        </Button>
      </form>
      <div>
        <Button variant="outline" onClick={() => void onSignOut()}>
          <LogOut aria-hidden className="size-4" />
          {a.signOut}
        </Button>
      </div>
    </div>
  )
}

/** The six-digit code sent at sign-up: it proves the address, and the bookings made with it join the account. */
function VerifyEmail({ user, a, onVerified }: { user: User; a: AccountMessages['account']; onVerified: (linked: number) => void }) {
  const { t, locale } = useI18n()
  const { setUser } = useAuth()
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState<'verify' | 'resend' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  const verify = async (event: FormEvent) => {
    event.preventDefault()
    setBusy('verify')
    setError(null)
    try {
      const result = await api<{ user: User; linkedBookings: number }>('/auth/email/verify', { method: 'POST', body: { code: code.trim() } })
      onVerified(result.linkedBookings)
      // The bookings list reloads for the new user, and picks up the bookings that joined.
      setUser(result.user)
    } catch (caught) {
      setError(errorMessage(caught, t))
    } finally {
      setBusy(null)
    }
  }

  const resend = async () => {
    setBusy('resend')
    setError(null)
    try {
      await api('/auth/email/send-code', { method: 'POST', body: { locale } })
      setSent(true)
    } catch (caught) {
      setError(errorMessage(caught, t))
    } finally {
      setBusy(null)
    }
  }

  return (
    <form onSubmit={verify} noValidate className="mt-8 rounded-md border border-gold-600/30 bg-gold-100/40 p-5 sm:p-6">
      <p className="flex items-center gap-2 font-semibold">
        <MailCheck aria-hidden className="size-5 text-gold-700" />
        {a.verifyTitle}
      </p>
      <p className="mt-2 text-sm leading-relaxed text-ink-900/70">{fill(a.verifyText, { email: user.email })}</p>
      <div className="mt-4 flex flex-wrap items-end gap-3">
        <TextField
          id="verify-code"
          label={a.verifyCode}
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          value={code}
          onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))}
          className="w-44"
        />
        <Button type="submit" variant="dark" loading={busy === 'verify'} disabled={busy !== null || code.length !== 6}>
          {a.verifySubmit}
        </Button>
        <button type="button" onClick={() => void resend()} disabled={busy !== null} className="h-12 text-sm font-medium text-ink-900/70 underline-offset-4 hover:text-ink-900 hover:underline disabled:opacity-50">
          {a.verifyResend}
        </button>
      </div>
      {sent ? <p className="mt-3 text-sm text-emerald-800">{fill(a.verifySent, { email: user.email })}</p> : null}
      {error ? (
        <div className="mt-3">
          <FormMessage tone="error">{error}</FormMessage>
        </div>
      ) : null}
    </form>
  )
}

/** A booking made with another email or phone (or as a guest) joins the account with its guest code. */
function AddBooking({ a, onAdded }: { a: AccountMessages['account']; onAdded: (booking: Booking) => void }) {
  const { t } = useI18n()
  const [form, setForm] = useState({ reference: '', code: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const result = await api<{ booking: Booking }>('/bookings/claim', { method: 'POST', body: { reference: form.reference.trim(), code: form.code.trim() } })
      onAdded(result.booking)
      setForm({ reference: '', code: '' })
    } catch (caught) {
      setError(errorMessage(caught, t))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} noValidate className="mt-10 rounded-md border border-ink-900/10 bg-white p-5 sm:p-6">
      <p className="flex items-center gap-2 font-semibold">
        <PlusCircle aria-hidden className="size-5 text-gold-700" />
        {a.addTitle}
      </p>
      <p className="mt-2 text-sm leading-relaxed text-ink-900/65">{a.addText}</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <TextField id="add-reference" label={a.addReference} autoCapitalize="characters" spellCheck={false} value={form.reference} onChange={(event) => setForm({ ...form, reference: event.target.value.toUpperCase() })} />
        <TextField id="add-code" label={a.addCode} autoCapitalize="characters" spellCheck={false} value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value.toUpperCase() })} />
        <Button type="submit" variant="outline" loading={busy} disabled={form.reference.trim().length < 4 || form.code.trim().length < 4}>
          {a.addSubmit}
        </Button>
      </div>
      {error ? (
        <div className="mt-3">
          <FormMessage tone="error">{error}</FormMessage>
        </div>
      ) : null}
    </form>
  )
}
