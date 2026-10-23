import maxmind, { type CityResponse, type Reader } from 'maxmind'

export interface Place {
  countryCode: string | null
  country: string | null
  region: string | null
  city: string | null
}

const NOWHERE: Place = { countryCode: null, country: null, region: null, city: null }

let reader: Promise<Reader<CityResponse> | null> | null = null

/** Opened on first use; a missing or unreadable file means "location unknown", never an error. */
function open(path: string | undefined): Promise<Reader<CityResponse> | null> {
  reader ??= path
    ? maxmind.open<CityResponse>(path).catch((error: unknown) => {
        console.error('[geoip] could not open', path, error instanceof Error ? error.message : error)
        return null
      })
    : Promise.resolve(null)
  return reader
}

/** The approximate place of an IP address: country, region and city, in English. */
export async function locate(ip: string, databasePath: string | undefined): Promise<Place> {
  const database = await open(databasePath)
  if (!database || !maxmind.validate(ip)) return NOWHERE
  const found = database.get(ip)
  if (!found) return NOWHERE
  return {
    countryCode: found.country?.iso_code ?? null,
    country: found.country?.names.en ?? null,
    region: found.subdivisions?.[0]?.names.en ?? null,
    city: found.city?.names.en ?? null,
  }
}
