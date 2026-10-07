import { cacheLife, cacheTag, io } from 'next/cache'
import type { Collection, ContentMap, SiteSettings, Vehicle } from './types'

/** Base URL of the backend API, as seen from the Next.js server. */
function apiBase(): string {
  return (process.env.API_URL ?? 'http://127.0.0.1:4000').replace(/\/+$/, '')
}

/**
 * `fetch` for calls from this server to the backend API, with a time limit.
 *
 * A connection to the API can drop just as it is reused. Requests that only
 * read data are safe to repeat, so they get one more attempt; anything that
 * changes data does not, and neither does a request that timed out.
 */
export function apiFetch(url: string, init: RequestInit = {}, timeoutMs = 25_000): Promise<Response> {
  const isRead = !init.method || init.method === 'GET' || init.method === 'HEAD'
  // Each attempt needs its own signal. Passing one also keeps Next.js from
  // answering the second attempt with the remembered failure of the first.
  const send = () => fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) })
  return send().catch((error: unknown) => {
    if (!isRead || (error instanceof Error && error.name === 'TimeoutError')) throw error
    return send()
  })
}

/** Why a call to the API failed. `fetch` only says "fetch failed"; the detail is in its cause. */
export function failureReason(error: unknown): string {
  if (!(error instanceof Error)) return String(error)
  const cause = error.cause as { message?: string; code?: string } | undefined
  const detail = cause?.message || cause?.code
  return detail ? `${error.message}: ${detail}` : error.message
}

/**
 * Cache tags. The gateway (`app/api`) clears them when an operator saves
 * something in the console, so changes show on the website straight away.
 */
export const FLEET_TAG = 'fleet'
export const CONTENT_TAG = 'content'

async function readJson<T>(path: string): Promise<T> {
  const response = await apiFetch(`${apiBase()}${path}`, {}, 10_000)
  if (!response.ok) throw new Error(`${path} answered with status ${response.status}`)
  return (await response.json()) as T
}

/*
 * The cached readers below talk to the backend, which is only reachable while
 * the site is running, not while it is being built. Pages therefore call the
 * `load...` functions, which wait for a real request first (`io()`), and sit
 * inside a <Suspense> boundary.
 */

async function getVehicles(): Promise<Vehicle[]> {
  'use cache'
  cacheLife('minutes')
  cacheTag(FLEET_TAG)
  return (await readJson<{ vehicles: Vehicle[] }>('/api/vehicles')).vehicles
}

async function getCollection<K extends Collection>(collection: K): Promise<ContentMap[K][]> {
  'use cache'
  cacheLife('minutes')
  cacheTag(CONTENT_TAG)
  return (await readJson<{ entries: ContentMap[K][] }>(`/api/content/${collection}`)).entries
}

async function getSettings(): Promise<SiteSettings> {
  'use cache'
  cacheLife('minutes')
  cacheTag(CONTENT_TAG)
  return (await readJson<{ settings: SiteSettings }>('/api/content/settings')).settings
}

/** The bookable fleet, in display order. */
export async function loadVehicles(): Promise<Vehicle[]> {
  await io()
  return getVehicles()
}

/** The published entries of one kind of content, in display order. */
export async function loadCollection<K extends Collection>(collection: K): Promise<ContentMap[K][]> {
  await io()
  return getCollection(collection)
}

/** The business details (phone, email, company data). */
export async function loadSettings(): Promise<SiteSettings> {
  await io()
  return getSettings()
}

/** For parts of a page that should simply be left out, rather than fail the page, when the API is down. */
export async function quietly<T>(what: string, load: Promise<T>, fallback: T): Promise<T> {
  try {
    return await load
  } catch (error) {
    // A visitor who leaves mid-load aborts the request; that is not a failure worth reporting.
    if (!(error instanceof Error && error.name === 'AbortError')) console.error(`[site] could not load ${what}:`, failureReason(error))
    return fallback
  }
}
