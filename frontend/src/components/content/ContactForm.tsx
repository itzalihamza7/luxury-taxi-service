'use client'

import { CircleCheck } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/Button'
import { FormMessage, TextareaField, TextField } from '@/components/ui/Field'
import { useI18n } from '@/i18n/client'
import type { PageMessages } from '@/i18n/messages/pages'
import { api, ApiError, errorMessage, fieldMessage } from '@/lib/api'

const EMPTY = { name: '', email: '', phone: '', subject: '', message: '', website: '' }

export function ContactForm({ c }: { c: PageMessages['contact'] }) {
  const { t, locale } = useI18n()
  const [form, setForm] = useState(EMPTY)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle')

  const set = (field: keyof typeof EMPTY) => (event: { target: { value: string } }) => {
    setForm({ ...form, [field]: event.target.value })
    setErrors({ ...errors, [field]: '' })
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setState('sending')
    setError(null)
    setErrors({})
    try {
      await api('/contact', { method: 'POST', body: { ...form, locale } })
      setState('sent')
      setForm(EMPTY)
    } catch (caught) {
      setState('idle')
      if (caught instanceof ApiError && caught.code === 'VALIDATION') setErrors(caught.fields)
      else setError(errorMessage(caught, t))
    }
  }

  if (state === 'sent') {
    return (
      <div role="status" className="flex flex-col items-start rounded-md border border-ink-900/10 bg-white p-8">
        <CircleCheck aria-hidden className="size-10 text-emerald-600" />
        <p className="mt-5 font-display text-2xl">{c.success}</p>
        <button type="button" onClick={() => setState('idle')} className="mt-6 text-sm font-medium underline decoration-gold-600/50 underline-offset-4 hover:decoration-gold-600">
          {c.another}
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-5 rounded-md border border-ink-900/10 bg-white p-6 sm:p-9">
      <h2 className="font-display text-3xl">{c.formTitle}</h2>
      <div className="grid gap-5 sm:grid-cols-2">
        <TextField id="contact-form-name" label={c.name} autoComplete="name" value={form.name} onChange={set('name')} error={fieldMessage(errors.name, t)} />
        <TextField id="contact-form-email" type="email" label={c.email} autoComplete="email" inputMode="email" value={form.email} onChange={set('email')} error={fieldMessage(errors.email, t)} />
        <TextField id="contact-form-phone" type="tel" label={c.phone} note={c.phoneHint} autoComplete="tel" inputMode="tel" value={form.phone} onChange={set('phone')} error={fieldMessage(errors.phone, t)} />
        <TextField id="contact-form-subject" label={c.subject} value={form.subject} onChange={set('subject')} error={fieldMessage(errors.subject, t)} />
      </div>
      <TextareaField id="contact-form-message" label={c.message} hint={c.messageHint} rows={6} maxLength={4000} value={form.message} onChange={set('message')} error={fieldMessage(errors.message, t)} />

      {/* Honeypot: invisible to people, tempting to bots. Filled-in submissions are discarded by the API. */}
      <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="contact-form-website">{c.website}</label>
        <input id="contact-form-website" name="website" type="text" tabIndex={-1} autoComplete="off" value={form.website} onChange={set('website')} />
      </div>

      {error ? <FormMessage tone="error">{error}</FormMessage> : null}
      <Button type="submit" variant="dark" size="lg" arrow loading={state === 'sending'}>
        {c.submit}
      </Button>
    </form>
  )
}
