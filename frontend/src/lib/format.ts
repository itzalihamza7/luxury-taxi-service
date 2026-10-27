import { fill, localeTags, type Locale } from '@/i18n/config'
import type { CommonMessages } from '@/i18n/messages/common'

/** `15900` -> `€159` / `159 €`. Decimals only appear when the amount has cents. */
/** A price, or `onRequest` (e.g. "Price on request") when it is agreed with the business after booking. */
export function formatPrice(cents: number | null, currency: string, locale: Locale, onRequest: string): string {
  return cents === null ? onRequest : formatMoney(cents, currency, locale)
}

export function formatMoney(cents: number, currency: string, locale: Locale): string {
  return new Intl.NumberFormat(localeTags[locale], {
    style: 'currency',
    currency,
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(cents / 100)
}

/** Date and time in the business time zone, e.g. "Fri 16 Oct 2026, 14:30". */
export function formatDateTime(iso: string, locale: Locale, timeZone: string): string {
  return new Intl.DateTimeFormat(localeTags[locale], {
    timeZone,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(iso))
}

/** A calendar date with no time, e.g. "20 January 2027". Input is `YYYY-MM-DD`. */
export function formatDate(date: string, locale: Locale, options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' }): string {
  return new Intl.DateTimeFormat(localeTags[locale], { ...options, timeZone: 'UTC' }).format(new Date(`${date}T00:00:00Z`))
}

/** "20 – 24 January 2027", collapsing the parts the two dates share. */
export function formatDateRange(start: string, end: string, locale: Locale): string {
  const formatter = new Intl.DateTimeFormat(localeTags[locale], { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
  return formatter.formatRange(new Date(`${start}T00:00:00Z`), new Date(`${end}T00:00:00Z`))
}

export function formatDistance(meters: number, t: CommonMessages): string {
  const km = meters / 1000
  return fill(t.units.km, { value: km < 10 ? km.toFixed(1) : Math.round(km) })
}

export function formatDuration(seconds: number, t: CommonMessages): string {
  const totalMinutes = Math.max(1, Math.round(seconds / 60))
  if (totalMinutes < 60) return fill(t.units.minutes, { value: totalMinutes })
  return fill(t.units.hoursMinutes, { hours: Math.floor(totalMinutes / 60), minutes: totalMinutes % 60 })
}

export function formatPassengers(count: number, t: CommonMessages): string {
  return count === 1 ? t.units.passenger : fill(t.units.passengers, { count })
}

export function formatBags(count: number, t: CommonMessages): string {
  return count === 1 ? t.units.bag : fill(t.units.bags, { count })
}

/** An instant as form values (`YYYY-MM-DD`, `HH:mm`) in the given time zone. */
export function zonedFormValues(epochMs: number, timeZone: string): { date: string; time: string } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(epochMs))
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? '00'
  return { date: `${get('year')}-${get('month')}-${get('day')}`, time: `${get('hour')}:${get('minute')}` }
}

/** The earliest sensible pickup: `minutesAhead` after `now`, rounded up to the next quarter hour. */
export function earliestPickup(now: number, timeZone: string, minutesAhead: number): { date: string; time: string } {
  const quarter = 15 * 60_000
  return zonedFormValues(Math.ceil((now + minutesAhead * 60_000) / quarter) * quarter, timeZone)
}

/** A form date and time shown the way a person would read it, e.g. "Fri 16 Oct, 14:30". */
export function formatFormDateTime(date: string, time: string, locale: Locale): string {
  if (!date) return ''
  const day = formatDate(date, locale, { weekday: 'short', day: 'numeric', month: 'short' })
  return time ? `${day}, ${time}` : day
}
