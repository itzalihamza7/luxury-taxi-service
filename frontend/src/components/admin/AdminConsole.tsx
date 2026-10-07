'use client'

import { ChevronDown, RefreshCw, Search } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/components/auth/AuthProvider'
import { BookingDetails, StatusBadge } from '@/components/booking/BookingDetails'
import { Button, ButtonLink } from '@/components/ui/Button'
import { controlClass, FormMessage } from '@/components/ui/Field'
import { useI18n } from '@/i18n/client'
import { fill, href } from '@/i18n/config'
import type { AccountMessages } from '@/i18n/messages/account'
import type { BookingMessages } from '@/i18n/messages/booking'
import type { ManageMessages } from '@/i18n/messages/manage'
import { api, errorMessage } from '@/lib/api'
import { formatDateTime, formatMoney } from '@/lib/format'
import { useAppConfig, useHydrated } from '@/lib/hooks'
import type { Booking, BookingStatus } from '@/lib/types'
import { BusinessDetails } from './BusinessDetails'
import { ContentManager } from './ContentManager'
import { FleetManager } from './FleetManager'

interface Props {
  a: AccountMessages['admin']
  b: BookingMessages
  m: ManageMessages
}

const TABS = ['bookings', 'messages', 'fleet', 'content', 'business'] as const
type Tab = (typeof TABS)[number]

interface Summary {
  bookings: Record<BookingStatus, number>
  upcoming: number
  messages: number
  subscribers: number
}

interface Message {
  id: string
  name: string
  email: string
  phone: string | null
  subject: string
  message: string
  createdAt: string
}

const STATUSES: BookingStatus[] = ['pending', 'confirmed', 'in_progress', 'completed', 'cancelled']
const PAGE_SIZE = 15

/** The status changes the API allows from each state. */
const NEXT_STEPS: Record<BookingStatus, { status: BookingStatus; action: keyof AccountMessages['admin']['actions'] }[]> = {
  pending: [{ status: 'confirmed', action: 'confirm' }],
  confirmed: [
    { status: 'in_progress', action: 'start' },
    { status: 'completed', action: 'complete' },
  ],
  in_progress: [{ status: 'completed', action: 'complete' }],
  completed: [],
  cancelled: [],
}

export function AdminConsole(props: Props) {
  return useHydrated() ? <Console {...props} /> : <div aria-busy="true" className="h-96 animate-pulse rounded-lg bg-ink-900/5" />
}

function Console({ a, b, m }: Props) {
  const { t, locale } = useI18n()
  const { user, ready } = useAuth()
  const router = useRouter()
  const config = useAppConfig()

  const [tab, setTab] = useState<Tab>('bookings')
  const [summary, setSummary] = useState<Summary | null>(null)
  const [status, setStatus] = useState<BookingStatus | ''>('')
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [list, setList] = useState<{ bookings: Booking[]; total: number } | null>(null)
  const [messages, setMessages] = useState<Message[] | null>(null)
  const [openReference, setOpenReference] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [reload, setReload] = useState(0)

  const isAdmin = user?.role === 'admin'

  useEffect(() => {
    if (ready && !user) router.replace(`${href(locale, '/login')}?next=/admin`)
  }, [ready, user, router, locale])

  // Wait for typing to pause before searching.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setQuery(search.trim())
      setPage(1)
    }, 300)
    return () => window.clearTimeout(timer)
  }, [search])

  const fail = useCallback((caught: unknown) => setError(errorMessage(caught, t)), [t])

  useEffect(() => {
    if (!isAdmin) return
    let active = true
    api<Summary>('/admin/summary')
      .then((result) => {
        if (active) setSummary(result)
      })
      .catch(fail)
    return () => {
      active = false
    }
  }, [isAdmin, reload, fail])

  useEffect(() => {
    if (!isAdmin || tab !== 'bookings') return
    let active = true
    const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) })
    if (status) params.set('status', status)
    if (query) params.set('q', query)
    api<{ bookings: Booking[]; total: number }>(`/admin/bookings?${params}`)
      .then((result) => {
        if (!active) return
        setList(result)
        setError(null)
      })
      .catch(fail)
    return () => {
      active = false
    }
  }, [isAdmin, tab, status, query, page, reload, fail])

  useEffect(() => {
    if (!isAdmin || tab !== 'messages') return
    let active = true
    api<{ messages: Message[] }>('/admin/messages?pageSize=50')
      .then((result) => {
        if (active) setMessages(result.messages)
      })
      .catch(fail)
    return () => {
      active = false
    }
  }, [isAdmin, tab, reload, fail])

  if (!user) return <p className="py-16 text-center text-sm text-ink-900/60">{t.loading}</p>
  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-md rounded-lg border border-ink-900/10 bg-white p-8 text-center">
        <p className="text-ink-900/70">{a.forbidden}</p>
        <ButtonLink href="/account" variant="dark" className="mt-6">
          {t.nav.account}
        </ButtonLink>
      </div>
    )
  }

  const update = async (booking: Booking, changes: { status?: BookingStatus; paymentStatus?: 'paid' | 'unpaid' }) => {
    if (changes.status === 'cancelled' && !window.confirm(a.cancelConfirm)) return
    setBusy(booking.reference)
    setError(null)
    try {
      const result = await api<{ booking: Booking }>(`/admin/bookings/${booking.reference}`, { method: 'PATCH', body: changes })
      setList((current) => (current ? { ...current, bookings: current.bookings.map((row) => (row.reference === booking.reference ? result.booking : row)) } : current))
      setReload((count) => count + 1)
    } catch (caught) {
      fail(caught)
    } finally {
      setBusy(null)
    }
  }

  const pages = list ? Math.max(1, Math.ceil(list.total / PAGE_SIZE)) : 1
  const cards = summary
    ? [
        { label: a.summary.pending, value: summary.bookings.pending, highlight: summary.bookings.pending > 0 },
        { label: a.summary.upcoming, value: summary.upcoming },
        { label: a.summary.messages, value: summary.messages },
        { label: a.summary.subscribers, value: summary.subscribers },
      ]
    : []

  return (
    <div>
      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className={`rounded-md border p-5 ${card.highlight ? 'border-gold-600 bg-gold-100/60' : 'border-ink-900/10 bg-white'}`}>
            <dt className="text-xs font-medium tracking-wide text-ink-900/60 uppercase">{card.label}</dt>
            <dd className="mt-2 font-display text-4xl">{card.value}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-b border-ink-900/10">
        <div role="tablist" className="flex flex-wrap gap-1">
          {TABS.map((id) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              onClick={() => setTab(id)}
              className={`-mb-px border-b-2 px-4 py-3 text-sm font-medium transition-colors ${tab === id ? 'border-gold-600 text-ink-900' : 'border-transparent text-ink-900/60 hover:text-ink-900'}`}
            >
              {id === 'bookings' || id === 'messages' ? a.tabs[id] : m.tabs[id]}
            </button>
          ))}
        </div>
        <button type="button" onClick={() => setReload((count) => count + 1)} className="mb-2 inline-flex items-center gap-2 text-sm text-ink-900/60 hover:text-ink-900">
          <RefreshCw aria-hidden className="size-4" />
          {a.refresh}
        </button>
      </div>

      {error ? (
        <div className="mt-5">
          <FormMessage tone="error">{error}</FormMessage>
        </div>
      ) : null}

      {tab === 'fleet' ? <FleetManager m={m} /> : null}
      {tab === 'content' ? <ContentManager m={m} /> : null}
      {tab === 'business' ? <BusinessDetails m={m} /> : null}

      {tab === 'bookings' ? (
        <div className="mt-6">
          <div className="flex flex-wrap gap-3">
            <div className="relative min-w-64 flex-1">
              <Search aria-hidden className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-ink-900/60" />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={a.search}
                aria-label={a.search}
                className={`${controlClass} h-11 border-ink-900/15 pl-11`}
              />
            </div>
            <select
              value={status}
              onChange={(event) => {
                setStatus(event.target.value as BookingStatus | '')
                setPage(1)
              }}
              aria-label={a.columns.status}
              className={`${controlClass} h-11 w-auto border-ink-900/15`}
            >
              <option value="">{a.allStatuses}</option>
              {STATUSES.map((option) => (
                <option key={option} value={option}>
                  {t.status[option]}
                </option>
              ))}
            </select>
          </div>

          {list === null ? (
            <p className="py-10 text-sm text-ink-900/60">{t.loading}</p>
          ) : list.bookings.length === 0 ? (
            <p className="mt-6 rounded-md border border-dashed border-ink-900/20 px-6 py-12 text-center text-ink-900/60">{a.none}</p>
          ) : (
            <ul className="mt-5 space-y-2.5">
              {list.bookings.map((booking) => {
                const open = openReference === booking.reference
                const refundDue = booking.status === 'cancelled' && booking.paymentStatus === 'paid' && booking.paymentMethod === 'online'
                return (
                  <li key={booking.reference} className="overflow-hidden rounded-md border border-ink-900/10 bg-white">
                    <button
                      type="button"
                      onClick={() => setOpenReference(open ? null : booking.reference)}
                      aria-expanded={open}
                      className="grid w-full gap-x-6 gap-y-2 p-4 text-left text-sm transition-colors hover:bg-bone-100/60 sm:grid-cols-2 lg:grid-cols-[8rem_11rem_1fr_1fr_5.5rem_auto] lg:items-center"
                    >
                      <span className="font-display text-lg tracking-wide">{booking.reference}</span>
                      <span className="font-medium">{formatDateTime(booking.pickupAt, locale, config.timeZone)}</span>
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{booking.contact.name}</span>
                        <span className="block truncate text-xs text-ink-900/60">
                          {booking.contact.phone}
                          {booking.isGuest ? ` · ${a.guest}` : ''}
                        </span>
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate">
                          {booking.pickup.label}
                          {booking.dropoff ? ` → ${booking.dropoff.label}` : ''}
                        </span>
                        <span className="block truncate text-xs text-ink-900/60">
                          {t.rideTypes[booking.rideType]} · {booking.vehicleName}
                        </span>
                      </span>
                      <span>
                        <span className="block font-display text-xl">{formatMoney(booking.totalCents, booking.currency, locale)}</span>
                        <span className={`block text-xs ${booking.paymentStatus === 'paid' ? 'font-semibold text-emerald-700' : 'text-ink-900/60'}`}>{t.payment[booking.paymentStatus]}</span>
                      </span>
                      <span className="flex items-center justify-between gap-3 lg:justify-end">
                        <StatusBadge status={booking.status} />
                        <ChevronDown aria-hidden className={`size-4 text-ink-900/60 transition-transform ${open ? 'rotate-180' : ''}`} />
                      </span>
                    </button>

                    {open ? (
                      <div className="border-t border-ink-900/10 p-5 sm:p-8">
                        {refundDue ? (
                          <div className="mb-6">
                            <FormMessage tone="error">{a.refundDue}</FormMessage>
                          </div>
                        ) : null}
                        <div className="mb-8 flex flex-wrap gap-2.5">
                          {NEXT_STEPS[booking.status].map((step) => (
                            <Button key={step.status} variant="dark" loading={busy === booking.reference} onClick={() => void update(booking, { status: step.status })}>
                              {a.actions[step.action]}
                            </Button>
                          ))}
                          <Button variant="outline" disabled={busy === booking.reference} onClick={() => void update(booking, { paymentStatus: booking.paymentStatus === 'paid' ? 'unpaid' : 'paid' })}>
                            {booking.paymentStatus === 'paid' ? a.actions.markUnpaid : a.actions.markPaid}
                          </Button>
                          {booking.status !== 'completed' && booking.status !== 'cancelled' ? (
                            <button
                              type="button"
                              disabled={busy === booking.reference}
                              onClick={() => void update(booking, { status: 'cancelled' })}
                              className="ml-auto px-3 text-sm font-medium text-red-700 underline-offset-4 hover:underline disabled:opacity-50"
                            >
                              {a.actions.cancel}
                            </button>
                          ) : null}
                        </div>
                        <BookingDetails booking={booking} b={b} timeZone={config.timeZone} hideCancel />
                      </div>
                    ) : null}
                  </li>
                )
              })}
            </ul>
          )}

          {list && list.total > 0 ? (
            <div className="mt-6 flex flex-wrap items-center justify-between gap-4 text-sm text-ink-900/60">
              <p>{fill(a.total, { count: list.total })}</p>
              <div className="flex items-center gap-3">
                <Button variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                  {a.previous}
                </Button>
                <span>{fill(a.page, { page, pages })}</span>
                <Button variant="outline" disabled={page >= pages} onClick={() => setPage(page + 1)}>
                  {a.next}
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {tab === 'messages' ? (
        <div className="mt-6">
          {messages === null ? (
            <p className="py-10 text-sm text-ink-900/60">{t.loading}</p>
          ) : messages.length === 0 ? (
            <p className="rounded-md border border-dashed border-ink-900/20 px-6 py-12 text-center text-ink-900/60">{a.messagesNone}</p>
          ) : (
            <ul className="space-y-3">
              {messages.map((message) => (
                <li key={message.id} className="rounded-md border border-ink-900/10 bg-white p-5 sm:p-6">
                  <div className="flex flex-wrap items-baseline justify-between gap-3">
                    <h3 className="font-display text-xl">{message.subject}</h3>
                    <p className="text-xs text-ink-900/60">
                      {a.received} {formatDateTime(message.createdAt, locale, config.timeZone)}
                    </p>
                  </div>
                  <p className="mt-1 text-sm text-ink-900/65">
                    {message.name} · {message.email}
                    {message.phone ? ` · ${message.phone}` : ''}
                  </p>
                  <p className="mt-4 text-[0.9375rem] leading-relaxed whitespace-pre-wrap text-ink-900/80">{message.message}</p>
                  <a href={`mailto:${message.email}?subject=${encodeURIComponent(`Re: ${message.subject}`)}`} className="mt-4 inline-block text-sm font-medium underline decoration-gold-600/50 underline-offset-4 hover:decoration-gold-600">
                    {a.reply}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  )
}
