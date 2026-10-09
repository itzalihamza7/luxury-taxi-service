'use client'

import { useRouter } from 'next/navigation'
import { useState, type FormEvent, type ReactNode } from 'react'
import { Button } from '@/components/ui/Button'
import { FormMessage, TextField } from '@/components/ui/Field'
import { Link } from '@/components/ui/Link'
import { useI18n } from '@/i18n/client'
import { href } from '@/i18n/config'
import type { AccountMessages } from '@/i18n/messages/account'
import { api, ApiError, errorMessage, fieldMessage } from '@/lib/api'
import { useContactDetails } from '@/lib/hooks'
import type { User } from '@/lib/types'
import { useAuth } from './AuthProvider'

/**
 * Where to go after signing in: the page that sent the visitor here, if it is one of ours.
 * Called from the submit handler, by which time the address bar shows this page.
 */
function destination(user: User, locale: Parameters<typeof href>[0]): string {
  const next = new URLSearchParams(window.location.search).get('next')
  if (next && next.startsWith('/') && !next.startsWith('//')) return href(locale, next)
  return href(locale, user.role === 'admin' ? '/admin' : '/account')
}

function Shell({ children }: { children: ReactNode }) {
  return <div className="mx-auto max-w-md rounded-lg border border-ink-900/10 bg-white p-6 sm:p-9">{children}</div>
}

const footLink = 'font-medium text-ink-900 underline decoration-gold-600/50 underline-offset-4 hover:decoration-gold-600'

export function LoginForm({ a }: { a: AccountMessages['login'] }) {
  const { t, locale } = useI18n()
  const { setUser } = useAuth()
  const router = useRouter()
  const [form, setForm] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError(null)
    setErrors({})
    try {
      const { user } = await api<{ user: User }>('/auth/login', { method: 'POST', body: form })
      setUser(user)
      router.replace(destination(user, locale))
    } catch (caught) {
      setBusy(false)
      if (caught instanceof ApiError && caught.code === 'VALIDATION') setErrors(caught.fields)
      else setError(errorMessage(caught, t))
    }
  }

  return (
    <Shell>
      <form onSubmit={submit} noValidate className="space-y-5">
        <TextField id="login-email" type="email" label={a.email} autoComplete="email" inputMode="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} error={fieldMessage(errors.email, t)} />
        <TextField id="login-password" type="password" label={a.password} autoComplete="current-password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} error={fieldMessage(errors.password, t)} />
        {error ? <FormMessage tone="error">{error}</FormMessage> : null}
        <Button type="submit" variant="dark" size="lg" loading={busy} className="w-full">
          {a.submit}
        </Button>
      </form>
      <div className="mt-7 space-y-2 border-t border-ink-900/10 pt-6 text-sm text-ink-900/65">
        <p>
          {a.noAccount}{' '}
          <Link href="/register" className={footLink}>
            {a.createOne}
          </Link>
        </p>
        <p>
          {a.guest}{' '}
          <Link href="/booking" className={footLink}>
            {a.bookAsGuest}
          </Link>
        </p>
      </div>
    </Shell>
  )
}

export function RegisterForm({ a }: { a: AccountMessages['register'] }) {
  const { t, locale } = useI18n()
  const { setUser } = useAuth()
  const router = useRouter()
  const settings = useContactDetails()
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const set = (field: keyof typeof form) => (event: { target: { value: string } }) => setForm({ ...form, [field]: event.target.value })
  const [beforeTerms, afterTerms] = a.consent.split('{terms}')
  const [between, afterPrivacy] = (afterTerms ?? '').split('{privacy}')

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError(null)
    setErrors({})
    try {
      const { user, linkedBookings } = await api<{ user: User; linkedBookings: number }>('/auth/register', { method: 'POST', body: form })
      setUser(user)
      const target = destination(user, locale)
      // Bookings the team took for this customer are now in the account: say so there.
      router.replace(linkedBookings > 0 && target === href(locale, '/account') ? `${target}?linked=${linkedBookings}` : target)
    } catch (caught) {
      setBusy(false)
      if (caught instanceof ApiError && caught.code === 'VALIDATION') setErrors(caught.fields)
      else setError(errorMessage(caught, t))
    }
  }

  return (
    <Shell>
      <form onSubmit={submit} noValidate className="space-y-5">
        <TextField id="register-name" label={a.name} autoComplete="name" value={form.name} onChange={set('name')} error={fieldMessage(errors.name, t)} />
        <TextField id="register-email" type="email" label={a.email} autoComplete="email" inputMode="email" value={form.email} onChange={set('email')} error={fieldMessage(errors.email, t)} />
        <TextField id="register-phone" type="tel" label={a.phone} hint={settings?.linkBookingsOnSignup ? a.phoneHintLinked : a.phoneHint} autoComplete="tel" inputMode="tel" value={form.phone} onChange={set('phone')} error={fieldMessage(errors.phone, t)} />
        <TextField
          id="register-password"
          type="password"
          label={a.password}
          hint={a.passwordHint}
          autoComplete="new-password"
          value={form.password}
          onChange={set('password')}
          error={errors.password === 'too_short' ? t.fields.password_short : fieldMessage(errors.password, t)}
        />
        {error ? <FormMessage tone="error">{error}</FormMessage> : null}
        <Button type="submit" variant="dark" size="lg" loading={busy} className="w-full">
          {a.submit}
        </Button>
        <p className="text-xs leading-relaxed text-ink-900/60">
          {beforeTerms}
          <Link href="/legal/terms" className="underline underline-offset-2">
            {a.termsLink}
          </Link>
          {between}
          <Link href="/legal/privacy" className="underline underline-offset-2">
            {a.privacyLink}
          </Link>
          {afterPrivacy}
        </p>
      </form>
      <p className="mt-7 border-t border-ink-900/10 pt-6 text-sm text-ink-900/65">
        {a.haveAccount}{' '}
        <Link href="/login" className={footLink}>
          {a.signIn}
        </Link>
      </p>
    </Shell>
  )
}
