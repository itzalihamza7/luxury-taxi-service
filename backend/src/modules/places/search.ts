import { HOME_LOCATION, SERVICE_AREA } from '../../config.js'
import { isInServiceArea } from '../../lib/geo.js'
import { CATALOG, type CatalogPlace, type PlaceKind } from './catalog.js'

export interface Place {
  id: string
  kind: PlaceKind
  label: string
  sublabel: string
  lat: number
  lng: number
}

type Locale = 'en' | 'es'

/** Lower-case and strip accents, so "avila" finds "Ávila". */
export function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

const toPlace = (entry: CatalogPlace, locale: Locale): Place => ({
  id: `cat:${entry.id}`,
  kind: entry.kind,
  label: entry.name[locale],
  sublabel: entry.detail[locale],
  lat: entry.lat,
  lng: entry.lng,
})

const INDEX = CATALOG.map((entry) => {
  const names = [normalize(entry.name.en), normalize(entry.name.es)]
  const words = [...names, ...(entry.keywords ?? []).map(normalize)].join(' ').split(' ')
  return { entry, names, words: [...new Set(words)] }
})

export function popularPlaces(locale: Locale): Place[] {
  return CATALOG.filter((entry) => entry.popular).map((entry) => toPlace(entry, locale))
}

/** Every word of the query must start some word of the place. Name matches rank first. */
export function searchCatalog(query: string, locale: Locale, limit = 6): Place[] {
  const terms = normalize(query).split(' ').filter(Boolean)
  if (terms.length === 0) return []

  const matches: { entry: CatalogPlace; score: number }[] = []
  for (const { entry, names, words } of INDEX) {
    if (!terms.every((term) => words.some((word) => word.startsWith(term)))) continue
    const joined = terms.join(' ')
    const score = names.some((name) => name.startsWith(joined)) ? 0 : names.some((name) => name.includes(joined)) ? 1 : 2
    matches.push({ entry, score })
  }
  return matches
    .sort((a, b) => a.score - b.score)
    .slice(0, limit)
    .map(({ entry }) => toPlace(entry, locale))
}

interface PhotonFeature {
  geometry?: { coordinates?: [number, number] }
  properties?: {
    osm_type?: string
    osm_id?: number
    type?: string
    name?: string
    street?: string
    housenumber?: string
    postcode?: string
    city?: string
    district?: string
    locality?: string
    county?: string
    state?: string
    countrycode?: string
  }
}

function fromPhoton(feature: PhotonFeature): Place | null {
  const coordinates = feature.geometry?.coordinates
  const p = feature.properties
  if (!coordinates || !p || p.countrycode !== 'ES') return null

  const [lng, lat] = coordinates
  if (typeof lat !== 'number' || typeof lng !== 'number' || !isInServiceArea({ lat, lng })) return null

  const streetAddress = [p.street, p.housenumber].filter(Boolean).join(' ')
  const town = [p.postcode, p.city ?? p.locality ?? p.county].filter(Boolean).join(' ')

  let label: string
  let sublabel: string
  if (p.type === 'house' || p.type === 'street') {
    // A named place (hotel, restaurant...) leads with its name; a plain address with the street.
    label = p.name && p.name !== p.street ? p.name : streetAddress || p.name || ''
    sublabel = [label === streetAddress ? '' : streetAddress, p.type === 'street' ? p.district : '', town].filter(Boolean).join(', ')
  } else {
    label = p.name ?? ''
    sublabel = [p.city && p.city !== p.name ? p.city : '', p.state].filter(Boolean).join(', ')
  }
  if (!label) return null

  return { id: `osm:${p.osm_type ?? ''}${p.osm_id ?? `${lat},${lng}`}`, kind: 'address', label, sublabel, lat, lng }
}

export type AddressSearch = (query: string) => Promise<Place[]>

const CACHE_TTL_MS = 60 * 60 * 1000
const CACHE_MAX_ENTRIES = 500
/** How many of the results near Madrid lead the list before those from the rest of Spain. */
const NEAR_FIRST = 4

/**
 * Address search backed by a Photon-compatible geocoder (OpenStreetMap data), across Spain.
 * Two searches run side by side: one biased towards Madrid, where most rides start, and one with no
 * bias, which finds a hotel in Barcelona or a street in Málaga that the first ranks below Madrid's
 * namesakes. The list leads with the nearest results, then the rest of Spain. Results are cached to
 * keep traffic to the upstream service low, and any failure simply yields fewer (or no) address
 * results - the catalogue still works.
 */
export function createAddressSearch(geocoderUrl: string): AddressSearch {
  const baseUrl = geocoderUrl.replace(/\/+$/, '')
  if (!baseUrl) return async () => []

  const cache = new Map<string, { expires: number; places: Place[] }>()

  const search = async (query: string, nearMadrid: boolean): Promise<Place[]> => {
    const params = new URLSearchParams({
      q: query.trim(),
      // Some answers are outside Spain and dropped, so the search across it asks for a few more.
      limit: nearMadrid ? '8' : '10',
      ...(nearMadrid ? { lat: String(HOME_LOCATION.lat), lon: String(HOME_LOCATION.lng) } : {}),
      bbox: [SERVICE_AREA.minLng, SERVICE_AREA.minLat, SERVICE_AREA.maxLng, SERVICE_AREA.maxLat].join(','),
    })
    const response = await fetch(`${baseUrl}/api?${params}`, {
      headers: { 'User-Agent': 'luxury-taxi-service/1.0 (booking address search)' },
      signal: AbortSignal.timeout(2500),
    })
    if (!response.ok) throw new Error(`geocoder responded ${response.status}`)
    const body = (await response.json()) as { features?: PhotonFeature[] }
    return (body.features ?? []).map(fromPhoton).filter((place): place is Place => place !== null)
  }

  return async (query) => {
    const key = normalize(query)
    if (key.length < 3) return []

    const cached = cache.get(key)
    if (cached && cached.expires > Date.now()) return cached.places

    const [near, wide] = await Promise.allSettled([search(query, true), search(query, false)])
    for (const result of [near, wide]) {
      if (result.status === 'rejected') {
        console.warn('[places] address search unavailable:', result.reason instanceof Error ? result.reason.message : result.reason)
      }
    }
    const nearby = near.status === 'fulfilled' ? near.value : []
    const across = wide.status === 'fulfilled' ? wide.value : []

    const seen = new Set<string>()
    const places: Place[] = []
    for (const place of [...nearby.slice(0, NEAR_FIRST), ...across, ...nearby.slice(NEAR_FIRST)]) {
      const signature = `${place.label}|${place.sublabel}`
      if (seen.has(place.id) || seen.has(signature)) continue
      seen.add(place.id)
      seen.add(signature)
      places.push(place)
    }

    // A failed search is tried again next time rather than remembered.
    if (near.status === 'fulfilled' && wide.status === 'fulfilled') {
      if (cache.size >= CACHE_MAX_ENTRIES) cache.clear()
      cache.set(key, { expires: Date.now() + CACHE_TTL_MS, places })
    }
    return places
  }
}
