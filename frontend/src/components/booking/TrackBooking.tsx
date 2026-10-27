'use client'

import { KeyRound, LogIn, Printer } from 'lucide-react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState, type FormEvent } from 'react'
import { useAuth } from '@/components/auth/AuthProvider'
import { Button, ButtonLink } from '@/components/ui/Button'
import { FormMessage, TextField } from '@/components/ui/Field'
import { Link } from '@/components/ui/Link'
import { useI18n } from '@/i18n/client'
import { href } from '@/i18n/config'
import type { BookingMessages } from '@/i18n/messages/booking'
import { api, ApiError, errorMessage, fieldMessage } from '@/lib/api'
import { lastBooking } from '@/lib/booking-draft'
import { useAppConfig, useHydrated } from '@/lib/hooks'
import type { Booking } from '@/lib/types'
import { BookingDetails } from './BookingDetails'

/*
 * A booking's own page (`/booking/<reference>`) and the form that leads to it (`/booking/track`).
 * A customer with an account sees their bookings after logging in; a guest opens one with its
 * reference and the guest code from the booking email, which this browser tab then remembers.
 */

const codeKey = (reference: string) => `booking-code:${reference}`

function rememberedCode(reference: string): string | null {
  try {
    return window.sessionStorage.getItem(codeKey(reference))
  } catch {
    return null
  }
}

function rememberCode(reference: string, code: string) {
  try {
    window.sessionStorage.setItem(codeKey(reference), code)
  } catch {
    // Storage blocked (private window): the code is asked again next time.
  }
}

/** Opens a guest's booking with its code, and remembers the code for this tab. */
async function open(reference: string, guestCode: string): Promise<Booking> {
  const result = await api<{ booking: Booking }>(`/bookings/${encodeURIComponent(reference)}/open`, { method: 'POST', body: { code: guestCode } })
  rememberCode(result.booking.reference, guestCode)
  return result.booking
}

/** "lx-k7qm2x" -> "LX-K7QM2X": what the API stores, so links and storage keys agree. */
const tidyReference = (value: string) => {
  const compact = value.toUpperCase().replace(/[^A-Z0-9]/g, '')
  return compact.length > 2 ? `${compact.slice(0, 2)}-${compact.slice(2)}` : compact
}

export function TrackBooking({ b }: { b: BookingMessages }) {
  const placeholder = <div aria-busy="true" className="mx-auto h-80 max-w-xl animate-pulse rounded-lg bg-ink-900/5" />
  return useHydrated() ? (
    <Suspense fallback={placeholder}>
      <Opener b={b} />
    </Suspense>
  ) : (
    placeholder
  )
}

function Opener({ b }: { b: BookingMessages }) {
  const { t, locale } = useI18n()
  const { user, ready } = useAuth()
  const config = useAppConfig()
  const router = useRouter()
  const searchParams = useSearchParams()
  const params = useParams<{ reference?: string }>()
  /** Set on the booking's own page; empty on the form that leads to it. */
  const pageReference = params.reference ? tidyReference(decodeURIComponent(params.reference)) : null

  const [form, setForm] = useState(() => ({ reference: pageReference ?? searchParams.get('ref') ?? lastBooking()?.reference ?? '', code: '' }))
  const [booking, setBooking] = useState<Booking | null>(null)
  const [code, setCode] = useState<string | null>(null)
  const [checking, setChecking] = useState(Boolean(pageReference))
  const [loginNeeded, setLoginNeeded] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  // On the booking's page: the account's booking, or the guest code this tab remembers.
  useEffect(() => {
    if (!pageReference || !ready) return
    let cancelled = false
    const load = async () => {
      if (user) {
        try {
          const result = await api<{ booking: Booking }>(`/bookings/${encodeURIComponent(pageReference)}`)
          if (!cancelled) setBooking(result.booking)
          return
        } catch {
          // Not this account's booking: a guest code may still open it.
        }
      }
      const remembered = rememberedCode(pageReference)
      if (remembered) {
        try {
          const opened = await open(pageReference, remembered)
          if (!cancelled) {
            setCode(remembered)
            setBooking(opened)
          }
        } catch (caught) {
          if (!cancelled && caught instanceof ApiError && caught.code === 'LOGIN_REQUIRED') setLoginNeeded(true)
        }
      }
    }
    void load().finally(() => {
      if (!cancelled) setChecking(false)
    })
    return () => {
      cancelled = true
    }
  }, [pageReference, ready, user])

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const reference = tidyReference(form.reference)
    const errorsFound: Record<string, string> = {}
    if (reference.length < 4) errorsFound.reference = 'required'
    if (form.code.trim().length < 4) errorsFound.code = 'required'
    setErrors(errorsFound)
    setError(null)
    setLoginNeeded(false)
    if (Object.keys(errorsFound).length > 0) return
    setBusy(true)
    try {
      const opened = await open(reference, form.code.trim())
      if (pageReference === opened.reference) {
        setCode(form.code.trim())
        setBooking(opened)
      } else {
        router.push(href(locale, `/booking/${opened.reference}`))
      }
    } catch (caught) {
      if (caught instanceof ApiError && caught.code === 'LOGIN_REQUIRED') setLoginNeeded(true)
      else if (caught instanceof ApiError && caught.code === 'VALIDATION') setErrors(caught.fields)
      else setError(errorMessage(caught, t))
    } finally {
      setBusy(false)
    }
  }

  if (checking) return <div aria-busy="true" className="mx-auto h-80 max-w-3xl animate-pulse rounded-lg bg-ink-900/5" />

  if (booking) {
    return (
      <div className="mx-auto max-w-3xl">
        <div className="rounded-lg border border-ink-900/10 bg-white p-6 sm:p-10">
          <BookingDetails booking={booking} b={b} timeZone={config.timeZone} proof={code ? { code } : undefined} onChange={setBooking} />
        </div>
        <div className="no-print mt-6 flex flex-wrap items-center justify-between gap-4">
          <Link href={user ? '/account' : '/booking/track'} className="text-sm font-medium text-ink-900/60 underline-offset-4 hover:text-ink-900 hover:underline">
            {user ? b.done.account : b.track.again}
          </Link>
          <Button variant="outline" onClick={() => window.print()}>
            <Printer aria-hidden className="size-4" />
            {t.actions.print}
          </Button>
        </div>
      </div>
    )
  }

  const loginHref = `/login?next=${encodeURIComponent(`/booking/${tidyReference(form.reference)}`)}`
  return (
    <div className="mx-auto max-w-xl">
      <form onSubmit={submit} noValidate className="space-y-5 rounded-lg border border-ink-900/10 bg-white p-6 sm:p-9">
        <TextField
          id="track-reference"
          label={b.track.reference}
          placeholder={b.track.referencePlaceholder}
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          value={form.reference}
          readOnly={Boolean(pageReference)}
          onChange={(event) => setForm({ ...form, reference: event.target.value.toUpperCase() })}
          error={fieldMessage(errors.reference, t)}
        />
        <TextField
          id="track-code"
          label={b.track.code}
          hint={b.track.codeHint}
          placeholder={b.track.codePlaceholder}
          autoCapitalize="characters"
          autoComplete="one-time-code"
          spellCheck={false}
          value={form.code}
          onChange={(event) => setForm({ ...form, code: event.target.value.toUpperCase() })}
          error={fieldMessage(errors.code, t)}
        />
        {loginNeeded ? (
          <div className="space-y-3 rounded-md bg-bone-100 p-4">
            <p className="text-sm text-ink-900/75">{b.track.loginRequired}</p>
            <ButtonLink href={loginHref} variant="dark">
              <LogIn aria-hidden className="size-4" />
              {b.track.login}
            </ButtonLink>
          </div>
        ) : null}
        {error ? <FormMessage tone="error">{error}</FormMessage> : null}
        <Button type="submit" variant="dark" size="lg" loading={busy} className="w-full">
          <KeyRound aria-hidden className="size-4" />
          {b.track.submit}
        </Button>
      </form>
      <p className="mt-5 text-center text-sm text-ink-900/60">{b.track.help}</p>
      <p className="mt-2 text-center text-sm">
        <Link href={user ? '/account' : loginHref} className="font-medium underline decoration-gold-600/50 underline-offset-4 hover:decoration-gold-600">
          {user ? b.track.signedIn : b.track.hasAccount}
        </Link>
      </p>
    </div>
  )
}
