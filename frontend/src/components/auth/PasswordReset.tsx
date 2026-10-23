'use client'

import { MailCheck } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Button, ButtonLink } from '@/components/ui/Button'
import { FormMessage, TextField } from '@/components/ui/Field'
import { Link } from '@/components/ui/Link'
import { useI18n } from '@/i18n/client'
import { fill, href } from '@/i18n/config'
import type { AccountMessages } from '@/i18n/messages/account'
import { api, ApiError, errorMessage, fieldMessage } from '@/lib/api'
import { useHydrated } from '@/lib/hooks'
import { isStaff, type User } from '@/lib/types'
import { useAuth } from './AuthProvider'

function Shell({ children }: { children: ReactNode }) {
  return <div className="mx-auto max-w-md rounded-lg border border-ink-900/10 bg-white p-6 sm:p-9">{children}</div>
}

const footLink = 'font-medium text-ink-900 underline decoration-gold-600/50 underline-offset-4 hover:decoration-gold-600'

/** Reads `?…` from the address, which only exists in the browser. */
function WithParams({ children }: { children: (params: URLSearchParams) => ReactNode }) {
  const placeholder = <div aria-busy="true" className="mx-auto h-72 max-w-md animate-pulse rounded-lg bg-ink-900/5" />
  return useHydrated() ? (
    <Suspense fallback={placeholder}>
      <Params>{children}</Params>
    </Suspense>
  ) : (
    placeholder
  )
}

function Params({ children }: { children: (params: URLSearchParams) => ReactNode }) {
  return children(new URLSearchParams(useSearchParams().toString()))
}

export function ForgotPasswordForm({ a, back }: { a: AccountMessages['forgot']; back: string }) {
  return <WithParams>{(params) => <Forgot a={a} back={back} initialEmail={params.get('email') ?? ''} />}</WithParams>
}

function Forgot({ a, back, initialEmail }: { a: AccountMessages['forgot']; back: string; initialEmail: string }) {
  const { t, locale } = useI18n()
  const [email, setEmail] = useState(initialEmail)
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError(null)
    setErrors({})
    try {
      await api('/auth/forgot', { method: 'POST', body: { email, locale } })
      setSentTo(email.trim())
    } catch (caught) {
      if (caught instanceof ApiError && caught.code === 'VALIDATION') setErrors(caught.fields)
      else setError(errorMessage(caught, t))
    } finally {
      setBusy(false)
    }
  }

  if (sentTo) {
    return (
      <Shell>
        <span className="flex size-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
          <MailCheck aria-hidden className="size-6" />
        </span>
        <h2 className="mt-5 font-display text-3xl">{a.sentTitle}</h2>
        <p className="mt-3 text-sm leading-relaxed text-ink-900/70" role="status">
          {fill(a.sentText, { email: sentTo })}
        </p>
        <ButtonLink href="/login" variant="outline" className="mt-7">
          {back}
        </ButtonLink>
      </Shell>
    )
  }

  return (
    <Shell>
      <form onSubmit={submit} noValidate className="space-y-5">
        <TextField id="forgot-email" type="email" label={a.email} autoComplete="email" inputMode="email" value={email} onChange={(event) => setEmail(event.target.value)} error={fieldMessage(errors.email, t)} />
        {error ? <FormMessage tone="error">{error}</FormMessage> : null}
        <Button type="submit" variant="dark" size="lg" loading={busy} className="w-full">
          {a.submit}
        </Button>
      </form>
      <p className="mt-7 border-t border-ink-900/10 pt-6 text-sm text-ink-900/65">
        <Link href="/login" className={footLink}>
          {back}
        </Link>
      </p>
    </Shell>
  )
}

export function ResetPasswordForm({ a }: { a: AccountMessages['reset'] }) {
  return <WithParams>{(params) => <Reset a={a} token={params.get('token') ?? ''} />}</WithParams>
}

function Reset({ a, token: linkToken }: { a: AccountMessages['reset']; token: string }) {
  const { t, locale } = useI18n()
  const { setUser } = useAuth()
  const router = useRouter()
  const [token] = useState(linkToken)
  // The token is taken out of the address bar at once, so it is not left in the history or shared by accident.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).has('token')) window.history.replaceState(null, '', window.location.pathname)
  }, [])
  const [form, setForm] = useState({ password: '', confirm: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [invalid, setInvalid] = useState(!token)
  const [done, setDone] = useState<User | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (form.password !== form.confirm) return setErrors({ confirm: 'mismatch' })
    setBusy(true)
    setError(null)
    setErrors({})
    try {
      const { user } = await api<{ user: User }>('/auth/reset', { method: 'POST', body: { token, password: form.password, locale } })
      setUser(user)
      setDone(user)
      window.setTimeout(() => router.replace(href(locale, isStaff(user) ? '/admin' : '/account')), 2500)
    } catch (caught) {
      setBusy(false)
      if (caught instanceof ApiError && caught.code === 'RESET_LINK_INVALID') setInvalid(true)
      else if (caught instanceof ApiError && caught.code === 'VALIDATION') setErrors(caught.fields)
      else setError(errorMessage(caught, t))
    }
  }

  if (invalid) {
    return (
      <Shell>
        <FormMessage tone="error">{token ? t.errors.RESET_LINK_INVALID : a.noLink}</FormMessage>
        <ButtonLink href="/forgot-password" variant="dark" className="mt-6">
          {a.askAgain}
        </ButtonLink>
      </Shell>
    )
  }

  if (done) {
    return (
      <Shell>
        <FormMessage tone="success">{a.done}</FormMessage>
      </Shell>
    )
  }

  return (
    <Shell>
      <form onSubmit={submit} noValidate className="space-y-5">
        <TextField
          id="reset-password"
          type="password"
          label={a.password}
          hint={a.passwordHint}
          autoComplete="new-password"
          value={form.password}
          onChange={(event) => setForm({ ...form, password: event.target.value })}
          error={errors.password === 'too_short' ? t.fields.password_short : fieldMessage(errors.password, t)}
        />
        <TextField
          id="reset-confirm"
          type="password"
          label={a.confirm}
          autoComplete="new-password"
          value={form.confirm}
          onChange={(event) => setForm({ ...form, confirm: event.target.value })}
          error={errors.confirm === 'mismatch' ? a.mismatch : undefined}
        />
        {error ? <FormMessage tone="error">{error}</FormMessage> : null}
        <Button type="submit" variant="dark" size="lg" loading={busy} className="w-full">
          {a.submit}
        </Button>
      </form>
    </Shell>
  )
}
