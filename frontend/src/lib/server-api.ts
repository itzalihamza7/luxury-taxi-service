import { cacheLife } from 'next/cache'
import type { Vehicle } from './types'

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
 * The bookable fleet, from the backend. The result is cached for about a
 * minute, so a price or vehicle change shows on the site shortly after.
 *
 * Call it after `await io()` (see `FleetData`): the backend is only reachable
 * while the site is running, not while the site is being built.
 */
export async function getVehicles(): Promise<Vehicle[]> {
  'use cache'
  cacheLife('minutes')

  const response = await apiFetch(`${apiBase()}/api/vehicles`, {}, 10_000)
  if (!response.ok) throw new Error(`Fleet request failed with status ${response.status}`)
  const body = (await response.json()) as { vehicles: Vehicle[] }
  return body.vehicles
}

/** Like `getVehicles`, but returns an empty list instead of failing the page when the API is down. */
export async function getVehiclesSafely(): Promise<Vehicle[]> {
  try {
    return await getVehicles()
  } catch (error) {
    console.error('[fleet] could not load vehicles:', failureReason(error))
    return []
  }
}
