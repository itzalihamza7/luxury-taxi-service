import { cacheLife } from 'next/cache'
import type { Vehicle } from './types'

/** Base URL of the backend API, as seen from the Next.js server. */
function apiBase(): string {
  return (process.env.API_URL ?? 'http://127.0.0.1:4000').replace(/\/+$/, '')
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

  const response = await fetch(`${apiBase()}/api/vehicles`)
  if (!response.ok) throw new Error(`Fleet request failed with status ${response.status}`)
  const body = (await response.json()) as { vehicles: Vehicle[] }
  return body.vehicles
}

/** Like `getVehicles`, but returns an empty list instead of failing the page when the API is down. */
export async function getVehiclesSafely(): Promise<Vehicle[]> {
  try {
    return await getVehicles()
  } catch (error) {
    console.error('[fleet] could not load vehicles:', error instanceof Error ? error.message : error)
    return []
  }
}
