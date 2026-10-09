'use client'

import { useEffect, useState } from 'react'
import { FormMessage } from '@/components/ui/Field'
import { useI18n } from '@/i18n/client'
import type { AccountMessages } from '@/i18n/messages/account'
import { api, errorMessage } from '@/lib/api'
import { formatDateTime } from '@/lib/format'
import { useAppConfig } from '@/lib/hooks'
import { Card, Empty } from './ui'

interface Message {
  id: string
  name: string
  email: string
  phone: string | null
  subject: string
  message: string
  createdAt: string
}

/** What visitors sent through the contact form, newest first. */
export function MessagesList({ a }: { a: AccountMessages['admin'] }) {
  const { t, locale } = useI18n()
  const config = useAppConfig()
  const [messages, setMessages] = useState<Message[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    api<{ messages: Message[] }>('/admin/messages?pageSize=50')
      .then((result) => {
        if (active) setMessages(result.messages)
      })
      .catch((caught: unknown) => {
        if (active) setError(errorMessage(caught, t))
      })
    return () => {
      active = false
    }
  }, [t])

  if (error) return <FormMessage tone="error">{error}</FormMessage>
  if (messages === null) return <p className="py-10 text-sm text-ink-900/60">{t.loading}</p>
  if (messages.length === 0) {
    return (
      <Card>
        <Empty>{a.messagesNone}</Empty>
      </Card>
    )
  }

  return (
    <ul className="space-y-4">
      {messages.map((message) => (
        <li key={message.id}>
          <Card className="p-5 sm:p-6">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <h2 className="text-base font-semibold tracking-tight">{message.subject}</h2>
              <p className="text-xs text-ink-900/60">
                {a.received} {formatDateTime(message.createdAt, locale, config.timeZone)}
              </p>
            </div>
            <p className="mt-1 text-sm text-ink-900/65">
              {message.name} · {message.email}
              {message.phone ? ` · ${message.phone}` : ''}
            </p>
            <p className="mt-4 max-w-3xl text-[0.9375rem] leading-relaxed whitespace-pre-wrap text-ink-900/80">{message.message}</p>
            <a href={`mailto:${message.email}?subject=${encodeURIComponent(`Re: ${message.subject}`)}`} className="mt-4 inline-block text-sm font-medium underline decoration-gold-600/50 underline-offset-4 hover:decoration-gold-600">
              {a.reply}
            </a>
          </Card>
        </li>
      ))}
    </ul>
  )
}
