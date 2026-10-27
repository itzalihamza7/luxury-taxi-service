import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { afterEach, describe, expect, it } from 'vitest'
import { isInServiceArea } from '../../lib/geo.js'
import { CATALOG } from './catalog.js'
import { createAddressSearch, normalize, popularPlaces, searchCatalog } from './search.js'

describe('place catalogue', () => {
  it('has unique ids and every place inside the service area', () => {
    expect(new Set(CATALOG.map((place) => place.id)).size).toBe(CATALOG.length)
    for (const place of CATALOG) {
      expect(isInServiceArea(place), place.id).toBe(true)
    }
  })

  it('offers quick picks that include an airport and a station', () => {
    const kinds = popularPlaces('en').map((place) => place.kind)
    expect(kinds).toContain('airport')
    expect(kinds).toContain('station')
    expect(kinds).toContain('city')
  })
})

describe('searchCatalog', () => {
  it('ignores accents and case', () => {
    expect(normalize('  Ávila, ESPAÑA ')).toBe('avila espana')
    expect(searchCatalog('avila', 'en')[0]?.label).toBe('Ávila')
    expect(searchCatalog('MÁLAGA', 'es')[0]?.label).toBe('Málaga')
  })

  it('returns labels in the requested language', () => {
    expect(searchCatalog('sevilla', 'en')[0]?.label).toBe('Seville')
    expect(searchCatalog('seville', 'es')[0]?.label).toBe('Sevilla')
  })

  it('matches keywords such as airport codes and terminals', () => {
    expect(searchCatalog('MAD', 'en').map((place) => place.kind)).toContain('airport')
    expect(searchCatalog('barajas t4', 'en')[0]?.id).toBe('cat:mad-t4')
    expect(searchCatalog('aeropuerto', 'es')).toHaveLength(2)
  })

  it('matches on word prefixes while typing', () => {
    expect(searchCatalog('ato', 'en')[0]?.id).toBe('cat:atocha')
    expect(searchCatalog('tol', 'en')[0]?.id).toBe('cat:toledo')
  })

  it('requires every word to match', () => {
    expect(searchCatalog('atocha toledo', 'en')).toEqual([])
  })

  it('returns nothing for empty or unknown queries', () => {
    expect(searchCatalog('', 'en')).toEqual([])
    expect(searchCatalog('   ', 'en')).toEqual([])
    expect(searchCatalog('zzzzzz', 'en')).toEqual([])
  })
})

describe('createAddressSearch', () => {
  let server: Server | undefined
  afterEach(() => server?.close())

  const listen = (handler: Parameters<typeof createServer>[1]) =>
    new Promise<string>((resolve) => {
      server = createServer(handler)
      server.listen(0, '127.0.0.1', () => resolve(`http://127.0.0.1:${(server!.address() as AddressInfo).port}`))
    })

  const feature = (properties: Record<string, unknown>, coordinates: [number, number]) => ({
    type: 'Feature',
    properties: { countrycode: 'ES', osm_type: 'N', ...properties },
    geometry: { type: 'Point', coordinates },
  })

  it('is a no-op when no geocoder is configured', async () => {
    expect(await createAddressSearch('')('Calle de Serrano 45')).toEqual([])
  })

  it('turns geocoder results into places, dropping foreign and duplicate results', async () => {
    const requests: URL[] = []
    const url = await listen((req, res) => {
      requests.push(new URL(req.url ?? '', 'http://stub'))
      res.setHeader('Content-Type', 'application/json')
      res.end(
        JSON.stringify({
          features: [
            // A named place at an address.
            feature(
              { osm_id: 1, type: 'house', name: 'Hotel Ejemplo', street: 'Calle de Serrano', housenumber: '45', postcode: '28001', city: 'Madrid' },
              [-3.6874, 40.4287],
            ),
            // A plain address.
            feature({ osm_id: 2, type: 'house', street: 'Calle de Serrano', housenumber: '47', postcode: '28001', city: 'Madrid' }, [-3.6873, 40.4291]),
            // The same address again under another id: dropped.
            feature({ osm_id: 3, type: 'house', street: 'Calle de Serrano', housenumber: '47', postcode: '28001', city: 'Madrid' }, [-3.6873, 40.4291]),
            // A street.
            feature({ osm_id: 4, type: 'street', name: 'Calle de Serrano', street: 'Calle de Serrano', district: 'Salamanca', postcode: '28006', city: 'Madrid' }, [-3.6869, 40.4353]),
            // A town.
            feature({ osm_id: 5, type: 'city', name: 'Getafe', state: 'Comunidad de Madrid' }, [-3.7326, 40.3083]),
            // Outside Spain: dropped.
            feature({ osm_id: 6, type: 'city', name: 'Lisboa', countrycode: 'PT' }, [-9.1393, 38.7223]),
            // Spanish, but outside the service area (Canary Islands): dropped.
            feature({ osm_id: 7, type: 'city', name: 'Las Palmas de Gran Canaria' }, [-15.4134, 28.1235]),
          ],
        }),
      )
    })

    const search = createAddressSearch(url)
    const places = await search('Calle de Serrano')

    expect(places).toEqual([
      { id: 'osm:N1', kind: 'address', label: 'Hotel Ejemplo', sublabel: 'Calle de Serrano 45, 28001 Madrid', lat: 40.4287, lng: -3.6874 },
      { id: 'osm:N2', kind: 'address', label: 'Calle de Serrano 47', sublabel: '28001 Madrid', lat: 40.4291, lng: -3.6873 },
      { id: 'osm:N4', kind: 'address', label: 'Calle de Serrano', sublabel: 'Salamanca, 28006 Madrid', lat: 40.4353, lng: -3.6869 },
      { id: 'osm:N5', kind: 'address', label: 'Getafe', sublabel: 'Comunidad de Madrid', lat: 40.3083, lng: -3.7326 },
    ])

    // Two requests, both restricted to the service area: one biased to the home city, one not.
    expect(requests).toHaveLength(2)
    for (const sent of requests) {
      expect(sent.pathname).toBe('/api')
      expect(sent.searchParams.get('q')).toBe('Calle de Serrano')
      expect(sent.searchParams.get('bbox')).toBe('-9.6,35.8,4.4,43.9')
    }
    expect(requests.filter((sent) => sent.searchParams.has('lat') && sent.searchParams.has('lon'))).toHaveLength(1)

    // A repeated query is served from the cache.
    await search('calle de serrano')
    expect(requests).toHaveLength(2)
  })

  it('leads with places near Madrid, then the rest of Spain, each once', async () => {
    const madrid = (id: number) => feature({ osm_id: id, type: 'house', name: `Madrid ${id}`, city: 'Madrid' }, [-3.7, 40.42])
    const barcelona = (id: number) => feature({ osm_id: id, type: 'house', name: `Barcelona ${id}`, city: 'Barcelona' }, [2.17, 41.39])
    const url = await listen((req, res) => {
      const nearMadrid = new URL(req.url ?? '', 'http://stub').searchParams.has('lat')
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ features: nearMadrid ? [1, 2, 3, 4, 5, 6].map(madrid) : [barcelona(10), madrid(1), barcelona(11)] }))
    })
    const places = await createAddressSearch(url)('Sagrada Familia')
    expect(places.map((place) => place.label)).toEqual(['Madrid 1', 'Madrid 2', 'Madrid 3', 'Madrid 4', 'Barcelona 10', 'Barcelona 11', 'Madrid 5', 'Madrid 6'])
  })

  it('still answers when one of the two searches fails', async () => {
    const url = await listen((req, res) => {
      if (new URL(req.url ?? '', 'http://stub').searchParams.has('lat')) {
        res.statusCode = 503
        res.end()
        return
      }
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ features: [feature({ osm_id: 10, type: 'house', name: 'Hotel Arts', city: 'Barcelona' }, [2.197, 41.386])] }))
    })
    expect((await createAddressSearch(url)('Hotel Arts')).map((place) => place.label)).toEqual(['Hotel Arts'])
  })

  it('does not query the geocoder for very short input', async () => {
    let hits = 0
    const url = await listen((_req, res) => {
      hits += 1
      res.end('{}')
    })
    expect(await createAddressSearch(url)('ca')).toEqual([])
    expect(hits).toBe(0)
  })

  it('returns no results (rather than failing) when the geocoder is down', async () => {
    const url = await listen((_req, res) => {
      res.statusCode = 503
      res.end()
    })
    expect(await createAddressSearch(url)('Gran Via 1')).toEqual([])
  })
})
