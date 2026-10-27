'use client'

import { ArrowRight, CalendarClock, CarFront, FileText, Hourglass, Inbox, Mail, PhoneCall, Settings, type LucideIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useAuth } from '@/components/auth/AuthProvider'
import { StatusBadge } from '@/components/booking/BookingDetails'
import { FormMessage } from '@/components/ui/Field'
import { Link } from '@/components/ui/Link'
import { useI18n } from '@/i18n/client'
import { fill } from '@/i18n/config'
import type { AccountMessages } from '@/i18n/messages/account'
import type { ManageMessages } from '@/i18n/messages/manage'
import { api, errorMessage } from '@/lib/api'
import { formatDateTime, formatPrice } from '@/lib/format'
import { useAppConfig } from '@/lib/hooks'
import type { Booking } from '@/lib/types'
import { useAdminSummary } from './AdminShell'
import { Card, CardHeader, Empty } from './ui'

interface Props {
  a: AccountMessages['admin']
  m: ManageMessages
}

/** Opens the bookings page on one booking. */
const bookingLink = (booking: Booking) => `/admin/bookings?q=${encodeURIComponent(booking.reference)}`

const route = (booking: Booking) => (booking.dropoff ? `${booking.pickup.label} → ${booking.dropoff.label}` : booking.pickup.label)

/** The first page of the admin panel: the counts that matter, the next rides and what is waiting. */
export function Overview({ a, m }: Props) {
  const { t, locale } = useI18n()
  const { user } = useAuth()
  const { summary } = useAdminSummary()
  const config = useAppConfig()
  const o = m.overview
  const [next, setNext] = useState<Booking[] | null>(null)
  const [waiting, setWaiting] = useState<Booking[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    Promise.all([api<{ bookings: Booking[] }>('/admin/bookings?view=upcoming&pageSize=6'), api<{ bookings: Booking[] }>('/admin/bookings?status=pending&pageSize=5')])
      .then(([upcoming, pending]) => {
        if (!active) return
        setNext(upcoming.bookings)
        setWaiting(pending.bookings)
      })
      .catch((caught: unknown) => {
        if (active) setError(errorMessage(caught, t))
      })
    return () => {
      active = false
    }
  }, [t])

  const pending = summary?.bookings.pending ?? 0
  const stats: { label: string; value: number | undefined; icon: LucideIcon; href?: string; alert?: boolean }[] = [
    { label: a.summary.pending, value: summary?.bookings.pending, icon: Hourglass, href: '/admin/bookings?status=pending', alert: pending > 0 },
    { label: a.summary.upcoming, value: summary?.upcoming, icon: CalendarClock, href: '/admin/bookings?view=upcoming' },
    { label: a.summary.messages, value: summary?.messages, icon: Inbox, href: '/admin/messages' },
    { label: a.summary.subscribers, value: summary?.subscribers, icon: Mail },
  ]
  const shortcuts: { label: string; href: string; icon: LucideIcon }[] = [
    { label: o.takeBooking, href: '/admin/bookings/new', icon: PhoneCall },
    { label: o.editFleet, href: '/admin/fleet', icon: CarFront },
    { label: o.editContent, href: '/admin/content', icon: FileText },
    { label: o.editSettings, href: '/admin/settings', icon: Settings },
  ]
  const more = 'inline-flex items-center gap-1.5 text-sm font-medium text-ink-900/60 transition-colors hover:text-ink-900'

  return (
    <div className="space-y-6">
      <div>
        <p className="text-2xl font-semibold tracking-tight">{fill(o.greeting, { name: user?.name.split(' ')[0] ?? '' })}</p>
        <p className="mt-1 text-sm text-ink-900/60">{o.lead}</p>
      </div>

      {error ? <FormMessage tone="error">{error}</FormMessage> : null}

      <dl className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          const body = (
            <>
              <span className={`flex size-10 items-center justify-center rounded-lg ${stat.alert ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-ink-900/70'}`}>
                <Icon aria-hidden strokeWidth={1.75} className="size-5" />
              </span>
              <dt className="mt-4 text-sm text-ink-900/60">{stat.label}</dt>
              <dd className="mt-1 text-3xl font-semibold tracking-tight tabular-nums">{stat.value ?? '–'}</dd>
            </>
          )
          const frame = `block h-full rounded-xl border bg-white p-5 shadow-[0_1px_2px_rgba(12,18,27,0.04)] ${stat.alert ? 'border-amber-300' : 'border-ink-900/10'}`
          return stat.href ? (
            <Link key={stat.label} href={stat.href} className={`${frame} transition-colors hover:border-ink-900/30`}>
              {body}
            </Link>
          ) : (
            <div key={stat.label} className={frame}>
              {body}
            </div>
          )
        })}
      </dl>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title={o.nextRides}>
            <Link href="/admin/bookings?view=upcoming" className={more}>
              {o.allBookings}
              <ArrowRight aria-hidden className="size-4" />
            </Link>
          </CardHeader>
          {next === null ? (
            <Empty>{error ? '–' : t.loading}</Empty>
          ) : next.length === 0 ? (
            <Empty>{o.nextRidesNone}</Empty>
          ) : (
            <ul className="divide-y divide-ink-900/10">
              {next.map((booking) => (
                <li key={booking.reference}>
                  <Link href={bookingLink(booking)} className="grid gap-x-5 gap-y-1 px-5 py-3.5 text-sm transition-colors hover:bg-slate-50 sm:grid-cols-[10.5rem_minmax(0,1fr)_auto] sm:items-center">
                    <span className="font-medium tabular-nums">{formatDateTime(booking.pickupAt, locale, config.timeZone)}</span>
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{booking.contact.name}</span>
                      <span className="block truncate text-xs text-ink-900/60">
                        {route(booking)} · {booking.vehicleName}
                      </span>
                    </span>
                    <span className="flex items-center gap-4 sm:justify-end">
                      <span className="font-medium tabular-nums">{formatPrice(booking.totalCents, booking.currency, locale, t.payment.onRequest)}</span>
                      <StatusBadge status={booking.status} />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader title={o.pending} />
            {waiting === null ? (
              <Empty>{error ? '–' : t.loading}</Empty>
            ) : waiting.length === 0 ? (
              <Empty>{o.pendingNone}</Empty>
            ) : (
              <ul className="divide-y divide-ink-900/10">
                {waiting.map((booking) => (
                  <li key={booking.reference}>
                    <Link href={bookingLink(booking)} className="block px-5 py-3.5 text-sm transition-colors hover:bg-slate-50">
                      <span className="flex items-baseline justify-between gap-3">
                        <span className="truncate font-medium">{booking.contact.name}</span>
                        <span className="shrink-0 text-xs font-medium tracking-wide text-ink-900/60">{booking.reference}</span>
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-ink-900/60">{formatDateTime(booking.pickupAt, locale, config.timeZone)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <CardHeader title={o.shortcuts} />
            <ul className="p-2">
              {shortcuts.map((shortcut) => {
                const Icon = shortcut.icon
                return (
                  <li key={shortcut.href}>
                    <Link href={shortcut.href} className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-ink-900/80 transition-colors hover:bg-slate-100 hover:text-ink-900">
                      <Icon aria-hidden strokeWidth={1.75} className="size-[1.125rem] shrink-0 text-ink-900/50" />
                      {shortcut.label}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  )
}
