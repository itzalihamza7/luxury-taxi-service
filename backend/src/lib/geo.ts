import { SERVICE_AREA } from '../config.js'

export interface LatLng {
  lat: number
  lng: number
}

export interface RouteResult {
  distanceM: number
  durationS: number
  /** `road` = measured by a routing server, `estimate` = computed from straight-line distance. */
  source: 'road' | 'estimate'
}

const EARTH_RADIUS_M = 6_371_000
const toRadians = (degrees: number) => (degrees * Math.PI) / 180

/** Great-circle distance in metres. */
export function haversineM(a: LatLng, b: LatLng): number {
  const dLat = toRadians(b.lat - a.lat)
  const dLng = toRadians(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRadians(a.lat)) * Math.cos(toRadians(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h))
}

export function isInServiceArea(point: LatLng): boolean {
  return (
    point.lat >= SERVICE_AREA.minLat &&
    point.lat <= SERVICE_AREA.maxLat &&
    point.lng >= SERVICE_AREA.minLng &&
    point.lng <= SERVICE_AREA.maxLng
  )
}

/**
 * A journey whose road distance has been measured, used to make estimates far
 * more accurate on the routes customers book most (see `estimateRoute`).
 */
export interface KnownRoute {
  a: LatLng
  b: LatLng
  /** How close a requested point must be to an end of this route to count as "the same place". */
  aRadiusM: number
  bRadiusM: number
  distanceM: number
  durationS: number
}

const near = (point: LatLng, centre: LatLng, radiusM: number) => haversineM(point, centre) <= radiusM

/**
 * Road distance and drive time worked out without a routing server.
 *
 * 1. If the journey runs between the two ends of a measured route (in either
 *    direction), that route's real distance is used, scaled by how much longer
 *    or shorter the requested journey is in a straight line. This is typically
 *    within a few percent.
 * 2. Otherwise the straight-line distance is lengthened by a typical detour:
 *    about 40% on short urban trips, about 20% on long motorway runs. Real
 *    roads vary (8% to 50% on the routes we measured), so expect ~10% error.
 *
 * Configure ROUTER_URL for exact, door-to-door figures.
 */
export function estimateRoute(from: LatLng, to: LatLng, known: KnownRoute[] = []): RouteResult {
  const straightM = haversineM(from, to)
  for (const route of known) {
    const forward = near(from, route.a, route.aRadiusM) && near(to, route.b, route.bRadiusM)
    const backward = near(from, route.b, route.bRadiusM) && near(to, route.a, route.aRadiusM)
    if (forward || backward) {
      const scale = straightM / haversineM(route.a, route.b)
      return { distanceM: Math.round(route.distanceM * scale), durationS: Math.round(route.durationS * scale), source: 'estimate' }
    }
  }

  const straightKm = straightM / 1000
  const detourFactor = 1.2 + 0.2 * Math.exp(-straightKm / 20)
  const roadKm = straightKm * detourFactor
  // Average speed rises from city traffic (~25 km/h) towards motorway pace (~90 km/h).
  const speedKmh = 25 + 65 * (1 - Math.exp(-roadKm / 35))
  return {
    distanceM: Math.round(roadKm * 1000),
    durationS: Math.round((roadKm / speedKmh) * 3600),
    source: 'estimate',
  }
}

export type RouteFinder = (from: LatLng, to: LatLng) => Promise<RouteResult>

const CACHE_TTL_MS = 24 * 60 * 60 * 1000
const CACHE_MAX_ENTRIES = 1000

/**
 * Build the route lookup. With `routerUrl` (an OSRM-compatible server) it
 * returns real road distances and falls back to the estimate if the server is
 * slow or unavailable. Without it, the estimate is used directly.
 */
export function createRouteFinder(routerUrl: string, known: KnownRoute[] = []): RouteFinder {
  const baseUrl = routerUrl.replace(/\/+$/, '')
  if (!baseUrl) return async (from, to) => estimateRoute(from, to, known)

  const cache = new Map<string, { expires: number; result: RouteResult }>()

  return async (from, to) => {
    const key = [from.lng, from.lat, to.lng, to.lat].map((value) => value.toFixed(5)).join(',')
    const cached = cache.get(key)
    if (cached && cached.expires > Date.now()) return cached.result

    try {
      const url = `${baseUrl}/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=false`
      const response = await fetch(url, { signal: AbortSignal.timeout(3500) })
      if (!response.ok) throw new Error(`routing server responded ${response.status}`)

      const body = (await response.json()) as { code?: string; routes?: { distance?: number; duration?: number }[] }
      const route = body.routes?.[0]
      if (body.code !== 'Ok' || typeof route?.distance !== 'number' || typeof route.duration !== 'number') {
        throw new Error(`routing server returned no route (${body.code ?? 'no code'})`)
      }

      const result: RouteResult = {
        distanceM: Math.round(route.distance),
        durationS: Math.round(route.duration),
        source: 'road',
      }
      if (cache.size >= CACHE_MAX_ENTRIES) cache.clear()
      cache.set(key, { expires: Date.now() + CACHE_TTL_MS, result })
      return result
    } catch (error) {
      console.warn('[routing] falling back to estimate:', error instanceof Error ? error.message : error)
      return estimateRoute(from, to, known)
    }
  }
}
