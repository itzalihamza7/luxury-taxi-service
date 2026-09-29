import { HOME_LOCATION } from '../../config.js'
import type { Localized } from '../../db/schema.js'
import type { KnownRoute } from '../../lib/geo.js'

export type PlaceKind = 'airport' | 'station' | 'venue' | 'landmark' | 'city' | 'address'

export interface CatalogPlace {
  id: string
  kind: Exclude<PlaceKind, 'address'>
  name: Localized
  detail: Localized
  lat: number
  lng: number
  /** Extra search terms (airport codes, former names, nicknames). */
  keywords?: string[]
  /** Offered as a quick pick before the customer types anything. */
  popular?: boolean
  /**
   * Road distance (km) and free-flow drive time (minutes) from central Madrid,
   * measured with a routing engine in October 2026. Makes price estimates on
   * these journeys accurate without a routing server.
   */
  road?: { km: number; minutes: number }
}

const MADRID: Localized = { en: 'Madrid', es: 'Madrid' }

/**
 * Hand-picked places customers ask for most. They are always searchable, even
 * when the external address search is unavailable, and are listed first.
 */
export const CATALOG: CatalogPlace[] = [
  // Airports
  {
    id: 'mad-t4',
    kind: 'airport',
    name: { en: 'Madrid–Barajas Airport · T4 & T4S', es: 'Aeropuerto Madrid–Barajas · T4 y T4S' },
    detail: { en: 'Adolfo Suárez Madrid–Barajas (MAD)', es: 'Adolfo Suárez Madrid–Barajas (MAD)' },
    lat: 40.4917,
    lng: -3.5931,
    keywords: ['mad', 'barajas', 'airport', 'aeropuerto', 'terminal 4', 't4', 't4s', 'adolfo suarez'],
    popular: true,
    road: { km: 19.1, minutes: 22 },
  },
  {
    id: 'mad-t123',
    kind: 'airport',
    name: { en: 'Madrid–Barajas Airport · T1, T2 & T3', es: 'Aeropuerto Madrid–Barajas · T1, T2 y T3' },
    detail: { en: 'Adolfo Suárez Madrid–Barajas (MAD)', es: 'Adolfo Suárez Madrid–Barajas (MAD)' },
    lat: 40.4675,
    lng: -3.5701,
    keywords: ['mad', 'barajas', 'airport', 'aeropuerto', 'terminal 1', 'terminal 2', 'terminal 3', 't1', 't2', 't3', 'adolfo suarez'],
    popular: true,
    road: { km: 15.7, minutes: 19 },
  },

  // Stations
  {
    id: 'atocha',
    kind: 'station',
    name: { en: 'Madrid Puerta de Atocha Station', es: 'Estación Madrid Puerta de Atocha' },
    detail: { en: 'AVE high-speed trains · Madrid', es: 'Trenes AVE · Madrid' },
    lat: 40.4066,
    lng: -3.6892,
    keywords: ['atocha', 'train', 'tren', 'ave', 'renfe', 'station', 'estacion', 'almudena grandes'],
    popular: true,
  },
  {
    id: 'chamartin',
    kind: 'station',
    name: { en: 'Madrid Chamartín Station', es: 'Estación Madrid Chamartín' },
    detail: { en: 'AVE high-speed trains · Madrid', es: 'Trenes AVE · Madrid' },
    lat: 40.4722,
    lng: -3.6826,
    keywords: ['chamartin', 'train', 'tren', 'ave', 'renfe', 'station', 'estacion', 'clara campoamor'],
    popular: true,
  },

  // Venues
  {
    id: 'ifema',
    kind: 'venue',
    name: { en: 'IFEMA Madrid', es: 'IFEMA Madrid' },
    detail: { en: 'Exhibition centre · Madrid', es: 'Recinto ferial · Madrid' },
    lat: 40.4638,
    lng: -3.6165,
    keywords: ['ifema', 'feria', 'trade fair', 'exhibition', 'congress', 'congreso', 'fitur', 'arco'],
    popular: true,
  },
  {
    id: 'bernabeu',
    kind: 'venue',
    name: { en: 'Santiago Bernabéu Stadium', es: 'Estadio Santiago Bernabéu' },
    detail: { en: 'Stadium · Madrid', es: 'Estadio · Madrid' },
    lat: 40.4531,
    lng: -3.6883,
    keywords: ['bernabeu', 'real madrid', 'stadium', 'estadio', 'football', 'futbol'],
  },
  {
    id: 'metropolitano',
    kind: 'venue',
    name: { en: 'Metropolitano Stadium', es: 'Estadio Metropolitano' },
    detail: { en: 'Stadium · Madrid', es: 'Estadio · Madrid' },
    lat: 40.4362,
    lng: -3.5995,
    keywords: ['metropolitano', 'atletico', 'stadium', 'estadio', 'wanda', 'civitas', 'riyadh air'],
  },
  {
    id: 'caja-magica',
    kind: 'venue',
    name: { en: 'Caja Mágica', es: 'Caja Mágica' },
    detail: { en: 'Tennis and events venue · Madrid', es: 'Recinto de tenis y eventos · Madrid' },
    lat: 40.369,
    lng: -3.6842,
    keywords: ['caja magica', 'tennis', 'tenis', 'mutua madrid open'],
  },
  {
    id: 'movistar-arena',
    kind: 'venue',
    name: { en: 'Movistar Arena', es: 'Movistar Arena' },
    detail: { en: 'Concert and sports arena · Madrid', es: 'Pabellón de conciertos y deporte · Madrid' },
    lat: 40.424,
    lng: -3.6718,
    keywords: ['movistar arena', 'wizink', 'palacio de deportes', 'concert', 'concierto', 'goya'],
  },

  // Landmarks
  {
    id: 'castellana',
    kind: 'landmark',
    name: { en: 'Paseo de la Castellana', es: 'Paseo de la Castellana' },
    detail: { en: 'Business district · Madrid', es: 'Distrito financiero · Madrid' },
    lat: 40.4505,
    lng: -3.6915,
    keywords: ['castellana', 'azca', 'business district', 'financial', 'nuevos ministerios'],
    popular: true,
  },
  {
    id: 'cuatro-torres',
    kind: 'landmark',
    name: { en: 'Cuatro Torres Business Area', es: 'Cuatro Torres Business Area' },
    detail: { en: 'Business district · Madrid', es: 'Distrito financiero · Madrid' },
    lat: 40.4772,
    lng: -3.6877,
    keywords: ['cuatro torres', 'ctba', 'four towers', 'torre', 'business'],
  },
  {
    id: 'sol',
    kind: 'landmark',
    name: { en: 'Puerta del Sol', es: 'Puerta del Sol' },
    detail: { en: 'City centre · Madrid', es: 'Centro · Madrid' },
    lat: 40.4169,
    lng: -3.7035,
    keywords: ['sol', 'centro', 'centre', 'center', 'city centre', 'downtown', 'kilometro cero'],
    popular: true,
  },
  {
    id: 'gran-via',
    kind: 'landmark',
    name: { en: 'Gran Vía', es: 'Gran Vía' },
    detail: { en: 'City centre · Madrid', es: 'Centro · Madrid' },
    lat: 40.42,
    lng: -3.7052,
    keywords: ['gran via', 'callao', 'centro', 'theatre', 'teatro'],
  },
  {
    id: 'plaza-mayor',
    kind: 'landmark',
    name: { en: 'Plaza Mayor', es: 'Plaza Mayor' },
    detail: { en: 'Old town · Madrid', es: 'Madrid de los Austrias' },
    lat: 40.4155,
    lng: -3.7074,
    keywords: ['plaza mayor', 'old town', 'austrias'],
  },
  {
    id: 'prado',
    kind: 'landmark',
    name: { en: 'Prado Museum', es: 'Museo del Prado' },
    detail: { en: 'Paseo del Prado · Madrid', es: 'Paseo del Prado · Madrid' },
    lat: 40.4138,
    lng: -3.6921,
    keywords: ['prado', 'museum', 'museo', 'art'],
  },
  {
    id: 'palacio-real',
    kind: 'landmark',
    name: { en: 'Royal Palace of Madrid', es: 'Palacio Real de Madrid' },
    detail: { en: 'Plaza de Oriente · Madrid', es: 'Plaza de Oriente · Madrid' },
    lat: 40.418,
    lng: -3.7142,
    keywords: ['royal palace', 'palacio real', 'oriente', 'almudena'],
  },

  // Cities
  city('madrid', MADRID, { en: 'City centre · Spain', es: 'Centro ciudad · España' }, 40.4168, -3.7038, ['capital']),
  city('toledo', { en: 'Toledo', es: 'Toledo' }, castilla('la-mancha'), 39.8628, -4.0273, [], { km: 73.0, minutes: 58 }),
  city('segovia', { en: 'Segovia', es: 'Segovia' }, castilla('leon'), 40.9481, -4.1184, ['aqueduct', 'acueducto'], { km: 90.8, minutes: 75 }),
  city('avila', { en: 'Ávila', es: 'Ávila' }, castilla('leon'), 40.6565, -4.6997, ['walls', 'murallas'], { km: 111.4, minutes: 86 }),
  city(
    'el-escorial',
    { en: 'San Lorenzo de El Escorial', es: 'San Lorenzo de El Escorial' },
    { en: 'Community of Madrid', es: 'Comunidad de Madrid' },
    40.5916,
    -4.1474,
    ['escorial', 'monastery', 'monasterio'],
    { km: 46.9, minutes: 47 },
  ),
  city('aranjuez', { en: 'Aranjuez', es: 'Aranjuez' }, { en: 'Community of Madrid', es: 'Comunidad de Madrid' }, 40.0333, -3.6033, ['palace', 'palacio'], { km: 49.4, minutes: 47 }),
  city(
    'alcala-de-henares',
    { en: 'Alcalá de Henares', es: 'Alcalá de Henares' },
    { en: 'Community of Madrid', es: 'Comunidad de Madrid' },
    40.482,
    -3.3635,
    ['alcala', 'cervantes'],
    { km: 35.0, minutes: 36 },
  ),
  city('salamanca', { en: 'Salamanca', es: 'Salamanca' }, castilla('leon'), 40.965, -5.664, [], { km: 212.8, minutes: 151 }),
  city('cuenca', { en: 'Cuenca', es: 'Cuenca' }, castilla('la-mancha'), 40.0718, -2.134, [], { km: 168.0, minutes: 120 }),
  city('valladolid', { en: 'Valladolid', es: 'Valladolid' }, castilla('leon'), 41.6523, -4.7245, [], { km: 188.8, minutes: 149 }),
  city('burgos', { en: 'Burgos', es: 'Burgos' }, castilla('leon'), 42.3409, -3.7038, [], { km: 245.4, minutes: 175 }),
  city('zaragoza', { en: 'Zaragoza', es: 'Zaragoza' }, { en: 'Aragon', es: 'Aragón' }, 41.6561, -0.8773, ['saragossa'], { km: 316.2, minutes: 215 }),
  city('valencia', { en: 'Valencia', es: 'Valencia' }, { en: 'Valencian Community', es: 'Comunidad Valenciana' }, 39.4699, -0.3763, [], { km: 356.7, minutes: 241 }),
  city('alicante', { en: 'Alicante', es: 'Alicante' }, { en: 'Valencian Community', es: 'Comunidad Valenciana' }, 38.3453, -0.4831, ['alacant'], { km: 421.3, minutes: 278 }),
  city('barcelona', { en: 'Barcelona', es: 'Barcelona' }, { en: 'Catalonia', es: 'Cataluña' }, 41.3874, 2.1686, [], { km: 617.7, minutes: 411 }),
  city('bilbao', { en: 'Bilbao', es: 'Bilbao' }, { en: 'Basque Country', es: 'País Vasco' }, 43.263, -2.935, ['bilbo', 'guggenheim'], { km: 397.6, minutes: 270 }),
  city(
    'san-sebastian',
    { en: 'San Sebastián', es: 'San Sebastián' },
    { en: 'Basque Country', es: 'País Vasco' },
    43.3183,
    -1.9812,
    ['donostia'],
    { km: 452.5, minutes: 309 },
  ),
  city('seville', { en: 'Seville', es: 'Sevilla' }, { en: 'Andalusia', es: 'Andalucía' }, 37.3861, -5.9926, [], { km: 534.6, minutes: 357 }),
  city('cordoba', { en: 'Córdoba', es: 'Córdoba' }, { en: 'Andalusia', es: 'Andalucía' }, 37.8847, -4.7792, ['cordova', 'mezquita'], { km: 396.4, minutes: 273 }),
  city('granada', { en: 'Granada', es: 'Granada' }, { en: 'Andalusia', es: 'Andalucía' }, 37.1765, -3.5979, ['alhambra'], { km: 420.5, minutes: 287 }),
  city('malaga', { en: 'Málaga', es: 'Málaga' }, { en: 'Andalusia', es: 'Andalucía' }, 36.7213, -4.4214, ['costa del sol'], { km: 529.2, minutes: 365 }),
]

function city(
  id: string,
  name: Localized,
  detail: Localized,
  lat: number,
  lng: number,
  keywords: string[] = [],
  road?: CatalogPlace['road'],
): CatalogPlace {
  return { id, kind: 'city', name, detail, lat, lng, keywords, popular: true, road }
}

/** Requests that start or end within this distance of the city centre count as "central Madrid". */
const CENTRAL_MADRID_RADIUS_M = 7000

/** The measured Madrid-to-place journeys, in the form the route estimator uses. */
export function knownRoutesFromMadrid(): KnownRoute[] {
  return CATALOG.flatMap((place) =>
    place.road
      ? [
          {
            a: HOME_LOCATION,
            aRadiusM: CENTRAL_MADRID_RADIUS_M,
            b: { lat: place.lat, lng: place.lng },
            // A city is a wide target; an airport terminal or venue is a precise one.
            bRadiusM: place.kind === 'city' ? 8000 : 2500,
            distanceM: Math.round(place.road.km * 1000),
            durationS: place.road.minutes * 60,
          },
        ]
      : [],
  )
}

function castilla(region: 'leon' | 'la-mancha'): Localized {
  return region === 'leon'
    ? { en: 'Castile and León', es: 'Castilla y León' }
    : { en: 'Castilla–La Mancha', es: 'Castilla-La Mancha' }
}
