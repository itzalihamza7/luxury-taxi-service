'use client'

import { ArrowRight, Check } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useI18n } from '@/i18n/client'
import { api, errorMessage, fieldMessage, ApiError } from '@/lib/api'

export function NewsletterForm() {
  const { t, locale } = useI18n()
  const [email, setEmail] = useState('')
  const [state, setState] = useState<'idle' | 'sending' | 'done'>('idle')
  const [error, setError] = useState<string | null>(null)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setState('sending')
    setError(null)
    try {
      await api('/newsletter', { method: 'POST', body: { email, locale } })
      setState('done')
    } catch (caught) {
      setState('idle')
      setError(caught instanceof ApiError && caught.fields.email ? (fieldMessage(caught.fields.email, t) ?? null) : errorMessage(caught, t))
    }
  }

  if (state === 'done') {
    return (
      <p role="status" className="mt-5 flex items-center gap-2 text-sm text-gold-300">
        <Check aria-hidden className="size-4" />
        {t.newsletter.success}
      </p>
    )
  }

  return (
    <form onSubmit={submit} className="mt-5" noValidate>
      <div className="flex items-center border-b border-white/20 transition-colors focus-within:border-gold-300">
        <label htmlFor="newsletter-email" className="sr-only">
          {t.newsletter.placeholder}
        </label>
        <input
          id="newsletter-email"
          type="email"
          name="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder={t.newsletter.placeholder}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? 'newsletter-error' : undefined}
          className="h-12 w-full bg-transparent text-sm text-bone-50 placeholder:text-bone-100/55 focus:outline-none"
        />
        <button
          type="submit"
          disabled={state === 'sending'}
          aria-label={t.newsletter.submit}
          className="flex size-10 shrink-0 items-center justify-center rounded-full text-gold-300 transition-transform hover:translate-x-1 disabled:opacity-50"
        >
          <ArrowRight aria-hidden className="size-5" />
        </button>
      </div>
      {error ? (
        <p id="newsletter-error" role="alert" className="mt-2 text-xs text-red-300">
          {error}
        </p>
      ) : null}
    </form>
  )
}
