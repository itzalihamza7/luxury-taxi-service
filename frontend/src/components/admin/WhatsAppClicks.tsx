'use client'

import { Monitor, Smartphone, Tablet, type LucideIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { FormMessage } from '@/components/ui/Field'
import { useI18n } from '@/i18n/client'
import { fill } from '@/i18n/config'
import type { AccountMessages } from '@/i18n/messages/account'
import type { ManageMessages } from '@/i18n/messages/manage'
import { api, errorMessage } from '@/lib/api'
import { formatDateTime } from '@/lib/format'
import { useAppConfig } from '@/lib/hooks'
import { Card, CardHeader, Empty, Lead } from './ui'

type DeviceType = 'mobile' | 'tablet' | 'desktop'

interface Click {
  id: string
  createdAt: string
  isNew: boolean
  page: string
  referrer: string | null
  language: string | null
  countryCode: string | null
  country: string | null
  region: string | null
  city: string | null
  deviceType: DeviceType
  os: string | null
  browser: string | null
}

interface Result {
  summary: {
    last7Days: { clicks: number; visitors: number }
    last30Days: { clicks: number; visitors: number }
    countries: { countryCode: string | null; country: string | null; visitors: number }[]
    devices: Partial<Record<DeviceType, number>>
  }
  clicks: Click[]
  total: number
}

const PAGE_SIZE = 25
const DEVICE_ICONS: Record<DeviceType, LucideIcon> = { mobile: Smartphone, tablet: Tablet, desktop: Monitor }

/** `ES` -> 🇪🇸 */
const flag = (code: string | null) => (code && /^[A-Z]{2}$/.test(code) ? String.fromCodePoint(...[...code].map((letter) => 0x1f1a5 + letter.charCodeAt(0))) : '')

/** Who opened WhatsApp from the website: roughly where, on what device, from which page. */
export function WhatsAppClicks({ a, m }: { a: AccountMessages['admin']; m: ManageMessages }) {
  const { t, locale } = useI18n()
  const config = useAppConfig()
  const w = m.whatsapp
  const [page, setPage] = useState(1)
  const [result, setResult] = useState<Result | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    api<Result>(`/admin/whatsapp-clicks?page=${page}&pageSize=${PAGE_SIZE}`)
      .then((loaded) => {
        if (active) setResult(loaded)
      })
      .catch((caught: unknown) => {
        if (active) setError(errorMessage(caught, t))
      })
    return () => {
      active = false
    }
  }, [page, t])

  if (error) return <FormMessage tone="error">{error}</FormMessage>
  if (!result) return <p className="py-10 text-sm text-ink-900/60">{t.loading}</p>

  const { summary } = result
  const stats = [
    { label: w.clicks7, value: summary.last7Days.clicks },
    { label: w.visitors7, value: summary.last7Days.visitors },
    { label: w.clicks30, value: summary.last30Days.clicks },
    { label: w.visitors30, value: summary.last30Days.visitors },
  ]
  const deviceTotal = Object.values(summary.devices).reduce((sum, value) => sum + (value ?? 0), 0)
  const pages = Math.max(1, Math.ceil(result.total / PAGE_SIZE))
  const place = (click: Click) => [click.city, click.region, click.country].filter(Boolean).join(', ') || w.unknown
  const head = 'text-xs font-semibold tracking-wide text-ink-900/55 uppercase'
  const columns = 'lg:grid-cols-[10.5rem_minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)_5.5rem] lg:items-center lg:gap-x-4'

  return (
    <div className="space-y-6">
      <Lead>{w.lead}</Lead>

      <dl className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="p-5">
            <dt className="text-sm text-ink-900/60">{stat.label}</dt>
            <dd className="mt-1 text-3xl font-semibold tracking-tight tabular-nums">{stat.value}</dd>
          </Card>
        ))}
      </dl>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title={w.countries} />
          {summary.countries.length === 0 ? (
            <Empty>–</Empty>
          ) : (
            <ul className="divide-y divide-ink-900/10">
              {summary.countries.map((row) => (
                <li key={row.countryCode ?? row.country} className="flex items-center justify-between gap-4 px-5 py-3 text-sm">
                  <span>
                    <span aria-hidden className="mr-2">
                      {flag(row.countryCode)}
                    </span>
                    {row.country}
                  </span>
                  <span className="font-semibold tabular-nums">{row.visitors}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card>
          <CardHeader title={w.devices} />
          {deviceTotal === 0 ? (
            <Empty>–</Empty>
          ) : (
            <ul className="space-y-4 px-5 py-4">
              {(['mobile', 'desktop', 'tablet'] as const).map((type) => {
                const value = summary.devices[type] ?? 0
                const Icon = DEVICE_ICONS[type]
                return (
                  <li key={type} className="text-sm">
                    <div className="flex items-center justify-between gap-4">
                      <span className="inline-flex items-center gap-2">
                        <Icon aria-hidden strokeWidth={1.75} className="size-4 text-ink-900/50" />
                        {w.deviceTypes[type]}
                      </span>
                      <span className="font-semibold tabular-nums">
                        {value} <span className="font-normal text-ink-900/50">({Math.round((value / deviceTotal) * 100)}%)</span>
                      </span>
                    </div>
                    <div aria-hidden className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-ink-900/70" style={{ width: `${(value / deviceTotal) * 100}%` }} />
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </Card>
      </div>

      <Card className="overflow-hidden">
        <CardHeader title={w.recent} />
        {result.clicks.length === 0 ? (
          <Empty>{w.none}</Empty>
        ) : (
          <>
            <div aria-hidden className={`hidden border-b border-ink-900/10 bg-slate-50 px-5 py-2.5 lg:grid ${columns}`}>
              <span className={head}>{w.columns.when}</span>
              <span className={head}>{w.columns.where}</span>
              <span className={head}>{w.columns.device}</span>
              <span className={head}>{w.columns.page}</span>
              <span className={head}>{w.columns.visitor}</span>
            </div>
            <ul className="divide-y divide-ink-900/10">
              {result.clicks.map((click) => {
                const Icon = DEVICE_ICONS[click.deviceType]
                return (
                  <li key={click.id} className={`grid gap-x-6 gap-y-1.5 px-5 py-3.5 text-sm sm:grid-cols-2 ${columns}`}>
                    <span className="font-medium tabular-nums">{formatDateTime(click.createdAt, locale, config.timeZone)}</span>
                    <span className="min-w-0 truncate">
                      <span aria-hidden className="mr-2">
                        {flag(click.countryCode)}
                      </span>
                      {place(click)}
                    </span>
                    <span className="flex min-w-0 items-center gap-2">
                      <Icon aria-label={w.deviceTypes[click.deviceType]} strokeWidth={1.75} className="size-4 shrink-0 text-ink-900/50" />
                      <span className="truncate">{[click.os, click.browser].filter(Boolean).join(' · ') || w.deviceTypes[click.deviceType]}</span>
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-mono text-xs">{click.page}</span>
                      {click.referrer ? <span className="block truncate text-xs text-ink-900/55">{fill(w.from, { site: click.referrer })}</span> : null}
                    </span>
                    <span>
                      {click.isNew ? (
                        <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-900">{w.newVisitor}</span>
                      ) : (
                        <span title={w.returningHint} className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-ink-900/70">
                          {w.returning}
                        </span>
                      )}
                    </span>
                  </li>
                )
              })}
            </ul>
          </>
        )}
        {result.total > PAGE_SIZE ? (
          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-ink-900/10 px-5 py-4 text-sm text-ink-900/60">
            <p>{result.total}</p>
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

      <p className="max-w-3xl text-xs leading-relaxed text-ink-900/55">
        {w.privacy}{' '}
        <a href="https://db-ip.com" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
          {w.attribution}
        </a>
        .
      </p>
    </div>
  )
}
