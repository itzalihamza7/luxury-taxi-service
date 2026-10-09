'use client'

import { ChevronDown, LogOut } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState, type FormEvent } from 'react'
import { useAuth } from '@/components/auth/AuthProvider'
import { BookingDetails, StatusBadge } from '@/components/booking/BookingDetails'
import { Button, ButtonLink } from '@/components/ui/Button'
import { FormMessage, TextField } from '@/components/ui/Field'
import { Accent } from '@/components/ui/Section'
import { useI18n } from '@/i18n/client'
import { fill, href } from '@/i18n/config'
import type { AccountMessages } from '@/i18n/messages/account'
import type { BookingMessages } from '@/i18n/messages/booking'
import { api, ApiError, errorMessage, fieldMessage } from '@/lib/api'
import { formatDateTime, formatMoney } from '@/lib/format'
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
                <span className="font-display text-2xl">{formatMoney(booking.totalCents, booking.currency, locale)}</span>
                <span className="inline-flex items-center gap-1 text-sm text-ink-900/60">
                  {open ? a.hide : a.view}
                  <ChevronDown aria-hidden className={`size-4 transition-transform ${open ? 'rotate-180' : ''}`} />
                </span>
              </span>
            </button>
            {open ? (
              <div className="border-t border-ink-900/10 p-5 sm:p-8">
                <BookingDetails booking={booking} b={b} timeZone={config.timeZone} onChange={replace} />
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
