'use client'

import { Printer, Search } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { Suspense, useState, type FormEvent } from 'react'
import { useAuth } from '@/components/auth/AuthProvider'
import { Button } from '@/components/ui/Button'
import { FormMessage, TextField } from '@/components/ui/Field'
import { Link } from '@/components/ui/Link'
import { useI18n } from '@/i18n/client'
import type { BookingMessages } from '@/i18n/messages/booking'
import { api, ApiError, errorMessage, fieldMessage } from '@/lib/api'
import { lastBooking } from '@/lib/booking-draft'
import { useAppConfig, useHydrated } from '@/lib/hooks'
import type { Booking } from '@/lib/types'
import { BookingDetails } from './BookingDetails'

export function TrackBooking({ b }: { b: BookingMessages }) {
  const placeholder = <div aria-busy="true" className="mx-auto h-80 max-w-xl animate-pulse rounded-lg bg-ink-900/5" />
  return useHydrated() ? (
    <Suspense fallback={placeholder}>
      <Tracker b={b} />
    </Suspense>
  ) : (
    placeholder
  )
}

function Tracker({ b }: { b: BookingMessages }) {
  const { t } = useI18n()
  const { user } = useAuth()
  const config = useAppConfig()

  const searchParams = useSearchParams()
  // Prefilled from the link (`?ref=`) or from the booking just made in this browser tab.
  const [form, setForm] = useState(() => {
    const recent = lastBooking()
    const fromLink = searchParams.get('ref')
    return { reference: fromLink ?? recent?.reference ?? '', contact: recent && (!fromLink || fromLink === recent.reference) ? recent.email : '' }
  })
  // One field takes either: an email address has an @, a phone number does not.
  const contact = form.contact.trim()
  const proof = contact.includes('@') ? { email: contact } : { phone: contact }
  const [booking, setBooking] = useState<Booking | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError(null)
    setErrors({})
    try {
      const result = await api<{ booking: Booking }>('/bookings/lookup', { method: 'POST', body: { reference: form.reference, ...proof } })
      setBooking(result.booking)
    } catch (caught) {
      if (caught instanceof ApiError && caught.code === 'VALIDATION') setErrors(caught.fields)
      else setError(errorMessage(caught, t))
    } finally {
      setBusy(false)
    }
  }

  if (booking) {
    return (
      <div className="mx-auto max-w-3xl">
        <div className="rounded-lg border border-ink-900/10 bg-white p-6 sm:p-10">
          <BookingDetails booking={booking} b={b} timeZone={config.timeZone} proof={proof} onChange={setBooking} />
        </div>
        <div className="no-print mt-6 flex flex-wrap items-center justify-between gap-4">
          <button type="button" onClick={() => setBooking(null)} className="text-sm font-medium text-ink-900/60 underline-offset-4 hover:text-ink-900 hover:underline">
            {b.track.again}
          </button>
          <Button variant="outline" onClick={() => window.print()}>
            <Printer aria-hidden className="size-4" />
            {t.actions.print}
          </Button>
        </div>
      </div>
    )
  }

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
          onChange={(event) => setForm({ ...form, reference: event.target.value.toUpperCase() })}
          error={fieldMessage(errors.reference, t)}
        />
        <TextField
          id="track-contact"
          label={b.track.contact}
          autoComplete="email"
          inputMode="email"
          autoCapitalize="none"
          spellCheck={false}
          value={form.contact}
          onChange={(event) => setForm({ ...form, contact: event.target.value })}
          error={fieldMessage(errors.email ?? errors.phone, t)}
        />
        {error ? <FormMessage tone="error">{error}</FormMessage> : null}
        <Button type="submit" variant="dark" size="lg" loading={busy} className="w-full">
          <Search aria-hidden className="size-4" />
          {b.track.submit}
        </Button>
      </form>
      <p className="mt-5 text-center text-sm text-ink-900/60">{b.track.help}</p>
      {user ? (
        <p className="mt-2 text-center text-sm">
          <Link href="/account" className="font-medium underline decoration-gold-600/50 underline-offset-4 hover:decoration-gold-600">
            {b.track.signedIn}
          </Link>
        </p>
      ) : null}
    </div>
  )
}
