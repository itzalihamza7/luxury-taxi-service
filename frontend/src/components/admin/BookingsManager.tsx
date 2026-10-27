'use client'

import { Bot, ChevronDown, PhoneCall, RefreshCw, Search } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { Suspense, useCallback, useEffect, useState } from 'react'
import { StatusBadge } from '@/components/booking/BookingDetails'
import { Button } from '@/components/ui/Button'
import { controlClass, FormMessage } from '@/components/ui/Field'
import { useI18n } from '@/i18n/client'
import { fill } from '@/i18n/config'
import type { AccountMessages } from '@/i18n/messages/account'
import type { BookingMessages } from '@/i18n/messages/booking'
import type { ManageMessages } from '@/i18n/messages/manage'
import { api, errorMessage } from '@/lib/api'
import { formatDateTime, formatPrice } from '@/lib/format'
import { useAppConfig } from '@/lib/hooks'
import type { AdminBooking, BookingStatus } from '@/lib/types'
import { useAdminSummary } from './AdminShell'
import { BookingConsole } from './BookingConsole'
import { Card, Empty } from './ui'

interface Props {
  a: AccountMessages['admin']
  b: BookingMessages
  m: ManageMessages
}

const STATUSES: BookingStatus[] = ['pending', 'confirmed', 'in_progress', 'completed', 'cancelled']
/** What the list can be narrowed to: everything, the rides still to come, or one status. */
type Filter = 'all' | 'upcoming' | BookingStatus
const FILTERS: Filter[] = ['all', 'upcoming', ...STATUSES]
const PAGE_SIZE = 15

/** The same columns for the heading row and every booking, once the screen is wide enough for a table. */
const COLUMNS = 'xl:grid-cols-[7.5rem_10rem_minmax(0,1fr)_minmax(0,1.3fr)_5rem_12.5rem] xl:items-center xl:gap-x-4'

/**
 * Every booking, to search, filter and move along. The filter and the search
 * can come from the address (`?status=pending`, `?q=LX-ABC123`): that is how
 * the overview opens this page on a particular list or booking.
 */
export function BookingsManager(props: Props) {
  return (
    <Suspense fallback={null}>
      <FromAddress {...props} />
    </Suspense>
  )
}

function FromAddress(props: Props) {
  const params = useSearchParams()
  const status = params.get('status')
  const filter: Filter = params.get('view') === 'upcoming' ? 'upcoming' : STATUSES.includes(status as BookingStatus) ? (status as BookingStatus) : 'all'
  // A new address starts the list afresh with what it asks for.
  return <Bookings key={params.toString()} {...props} initialFilter={filter} initialSearch={params.get('q')?.trim() ?? ''} />
}

function Bookings({ a, b, m, initialFilter, initialSearch }: Props & { initialFilter: Filter; initialSearch: string }) {
  const { t, locale } = useI18n()
  const config = useAppConfig()
  const { summary, refresh } = useAdminSummary()

  const [filter, setFilter] = useState<Filter>(initialFilter)
  const [search, setSearch] = useState(initialSearch)
  const [query, setQuery] = useState(initialSearch)
  const [page, setPage] = useState(1)
  const [list, setList] = useState<{ bookings: AdminBooking[]; total: number } | null>(null)
  // Arriving with a booking's reference opens that booking.
  const [openReference, setOpenReference] = useState<string | null>(initialSearch ? initialSearch.toUpperCase() : null)
  const [error, setError] = useState<string | null>(null)
  const [reload, setReload] = useState(0)

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
    let active = true
    const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) })
    if (filter === 'upcoming') params.set('view', 'upcoming')
    else if (filter !== 'all') params.set('status', filter)
    if (query) params.set('q', query)
    api<{ bookings: AdminBooking[]; total: number }>(`/admin/bookings?${params}`)
      .then((result) => {
        if (!active) return
        setList(result)
        setError(null)
      })
      .catch(fail)
    return () => {
      active = false
    }
  }, [filter, query, page, reload, fail])

  const reloadAll = () => {
    setReload((count) => count + 1)
    refresh()
  }

  /** A booking changed in its panel: its row follows, and so do the counts. */
  const changed = (updated: AdminBooking) => {
    setList((current) => (current ? { ...current, bookings: current.bookings.map((row) => (row.reference === updated.reference ? updated : row)) } : current))
    refresh()
  }

  const counts: Partial<Record<Filter, number>> = summary ? { ...summary.bookings, all: STATUSES.reduce((sum, status) => sum + summary.bookings[status], 0), upcoming: summary.upcoming } : {}
  const label = (id: Filter) => (id === 'all' ? m.bookings.all : id === 'upcoming' ? m.bookings.upcoming : t.status[id])
  const pages = list ? Math.max(1, Math.ceil(list.total / PAGE_SIZE)) : 1
  const columnHead = 'text-xs font-semibold tracking-wide text-ink-900/55 uppercase'

  return (
    <div className="space-y-4">
      {error ? <FormMessage tone="error">{error}</FormMessage> : null}

      <Card className="overflow-hidden">
        <div className="space-y-4 border-b border-ink-900/10 p-4 sm:p-5">
          <div className="flex gap-3">
            <div className="relative min-w-0 flex-1">
              <Search aria-hidden className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-ink-900/60" />
              <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={a.search} aria-label={a.search} className={`${controlClass} h-11 border-ink-900/15 pl-11`} />
            </div>
            <button type="button" onClick={reloadAll} aria-label={a.refresh} title={a.refresh} className="flex size-11 shrink-0 items-center justify-center rounded-md border border-ink-900/15 bg-white text-ink-900/60 transition-colors hover:border-ink-900/30 hover:text-ink-900">
              <RefreshCw aria-hidden className="size-4" />
            </button>
          </div>
          <div role="group" aria-label={m.bookings.filter} className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
            {FILTERS.map((id) => (
              <button
                key={id}
                type="button"
                aria-pressed={filter === id}
                onClick={() => {
                  setFilter(id)
                  setPage(1)
                }}
                className={`shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${filter === id ? 'border-ink-950 bg-ink-950 text-bone-50' : 'border-ink-900/15 bg-white text-ink-900/70 hover:border-ink-900/40 hover:text-ink-900'}`}
              >
                {label(id)}
                {counts[id] === undefined ? null : <span className="ml-2 tabular-nums opacity-60">{counts[id]}</span>}
              </button>
            ))}
          </div>
        </div>

        {list === null ? (
          <Empty>{t.loading}</Empty>
        ) : list.bookings.length === 0 ? (
          <Empty>{a.none}</Empty>
        ) : (
          <>
            <div aria-hidden className={`hidden border-b border-ink-900/10 bg-slate-50 px-5 py-2.5 xl:grid ${COLUMNS}`}>
              <span className={columnHead}>{a.columns.reference}</span>
              <span className={columnHead}>{a.columns.pickup}</span>
              <span className={columnHead}>{a.columns.customer}</span>
              <span className={columnHead}>{a.columns.ride}</span>
              <span className={columnHead}>{a.columns.total}</span>
              <span className={columnHead}>{a.columns.status}</span>
            </div>
            <ul className="divide-y divide-ink-900/10">
              {list.bookings.map((booking) => {
                const open = openReference === booking.reference
                const refundDue = booking.status === 'cancelled' && booking.paymentStatus === 'paid' && booking.paymentMethod === 'online'
                return (
                  <li key={booking.reference}>
                    <button
                      type="button"
                      onClick={() => setOpenReference(open ? null : booking.reference)}
                      aria-expanded={open}
                      className={`grid w-full gap-x-6 gap-y-2 px-5 py-4 text-left text-sm transition-colors hover:bg-slate-50 sm:grid-cols-2 ${COLUMNS} ${open ? 'bg-slate-50' : ''}`}
                    >
                      <span>
                        <span className="block font-semibold tracking-wide">{booking.reference}</span>
                        {booking.source === 'operator' ? (
                          <span title={m.bookings.byPhoneHint} className="mt-1 inline-flex items-center gap-1 rounded-full bg-sky-100 px-2 py-0.5 text-[0.6875rem] font-semibold text-sky-900">
                            <PhoneCall aria-hidden className="size-3" />
                            {m.bookings.byPhone}
                          </span>
                        ) : booking.source === 'agent' ? (
                          <span title={m.bookings.byAgentHint} className="mt-1 inline-flex items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-[0.6875rem] font-semibold text-violet-900">
                            <Bot aria-hidden className="size-3" />
                            {m.bookings.byAgent}
                          </span>
                        ) : null}
                      </span>
                      <span className="font-medium tabular-nums">{formatDateTime(booking.pickupAt, locale, config.timeZone)}</span>
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{booking.contact.name}</span>
                        <span className="block truncate text-xs text-ink-900/60">
                          {booking.contact.phone ?? booking.contact.email}
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
                        <span className="block font-semibold tabular-nums">{formatPrice(booking.totalCents, booking.currency, locale, t.payment.onRequest)}</span>
                        <span className={`block text-xs ${booking.paymentStatus === 'unpaid' ? 'text-ink-900/60' : 'font-semibold text-emerald-700'}`}>{t.payment[booking.paymentStatus]}</span>
                        {booking.proofToCheck ? (
                          <span className="mt-1 inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[0.6875rem] font-semibold text-amber-900">{m.bookings.proofToCheck}</span>
                        ) : null}
                      </span>
                      <span className="flex items-center justify-between gap-3">
                        <StatusBadge status={booking.status} />
                        <ChevronDown aria-hidden className={`size-4 shrink-0 text-ink-900/60 transition-transform ${open ? 'rotate-180' : ''}`} />
                      </span>
                    </button>

                    {open ? (
                      <div className="border-t border-ink-900/10 p-5 sm:p-8">
                        {refundDue ? (
                          <div className="mb-6">
                            <FormMessage tone="error">{a.refundDue}</FormMessage>
                          </div>
                        ) : null}
                        <BookingConsole reference={booking.reference} a={a} b={b} m={m} onChanged={changed} />
                      </div>
                    ) : null}
                  </li>
                )
              })}
            </ul>
          </>
        )}

        {list && list.total > 0 ? (
          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-ink-900/10 px-5 py-4 text-sm text-ink-900/60">
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
      </Card>
    </div>
  )
}
