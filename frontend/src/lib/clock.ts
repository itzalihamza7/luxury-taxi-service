import { cacheLife } from 'next/cache'

/**
 * "Now", for pages that are otherwise static. Each value is captured when the
 * page is rendered and refreshed on the schedule below, so a copyright year or
 * an "upcoming events" list stays current without rendering on every request.
 */

/** The current year (refreshed daily). */
export async function currentYear(): Promise<number> {
  'use cache'
  cacheLife('days')
  return new Date().getFullYear()
}

/** Today's date in Madrid as `YYYY-MM-DD` (refreshed hourly). */
export async function todayInMadrid(): Promise<string> {
  'use cache'
  cacheLife('hours')
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
}
