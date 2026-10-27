import { haversineM, type LatLng } from './geo.js'

/*
 * The price zone: a transfer inside the M-30 ring road, or between the airport and the M-30, has a
 * fixed price; each road kilometre beyond the zone is added at the vehicle's rate per km.
 */

/**
 * The M-30, as [lat, lng], anticlockwise from the east. Traced from OpenStreetMap's M-30 motorway
 * (© OpenStreetMap contributors, ODbL) on 26 October 2026: its outermost carriageway around
 * Puerta del Sol, every 2 degrees, simplified to within about 40 m.
 */
const M30: [number, number][] = [
  [40.4177, -3.65856], [40.43294, -3.66055], [40.43803, -3.65903], [40.44155, -3.65886],
  [40.44912, -3.66199], [40.46051, -3.66465], [40.46672, -3.66812], [40.47343, -3.6733],
  [40.47839, -3.67425], [40.4857, -3.67359], [40.48315, -3.6821], [40.4834, -3.68773],
  [40.48573, -3.69413], [40.48021, -3.71335], [40.4747, -3.72327], [40.47279, -3.72956],
  [40.47275, -3.73274], [40.47453, -3.74676], [40.47364, -3.74991], [40.46944, -3.75023],
  [40.46465, -3.74892], [40.45716, -3.74459], [40.45342, -3.74363], [40.44579, -3.73994],
  [40.43016, -3.73698], [40.42717, -3.73459], [40.4257, -3.73253], [40.42048, -3.72279],
  [40.41804, -3.72239], [40.41474, -3.7238], [40.4142, -3.72387], [40.41399, -3.72231],
  [40.41338, -3.7239], [40.40807, -3.72229], [40.40774, -3.72151], [40.40642, -3.72289],
  [40.40481, -3.72311], [40.40401, -3.72223], [40.40282, -3.72285], [40.40041, -3.72161],
  [40.39963, -3.71984], [40.39923, -3.71509], [40.39796, -3.71282], [40.39829, -3.71202],
  [40.39728, -3.71181], [40.39635, -3.71], [40.39628, -3.70745], [40.39544, -3.70712],
  [40.3957, -3.70555], [40.38238, -3.69063], [40.38175, -3.68718], [40.3836, -3.68365],
  [40.39064, -3.67839], [40.39453, -3.6724], [40.39719, -3.66997]
]

/** Madrid-Barajas airport: terminals T1, T2, T3, T4 and T4S, with their access roads and car parks. */
const AIRPORT: [number, number][] = [
  [40.501, -3.601],
  [40.501, -3.564],
  [40.479, -3.552],
  [40.46, -3.56],
  [40.46, -3.58],
  [40.48, -3.601],
]

/** Ray casting: whether `point` lies inside `polygon`. */
function inside(point: LatLng, polygon: [number, number][]): boolean {
  let result = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [latI, lngI] = polygon[i]!
    const [latJ, lngJ] = polygon[j]!
    if (latI > point.lat !== latJ > point.lat && point.lng < ((lngJ - lngI) * (point.lat - latI)) / (latJ - latI) + lngI) {
      result = !result
    }
  }
  return result
}

export const insideM30 = (point: LatLng) => inside(point, M30)
export const atAirport = (point: LatLng) => inside(point, AIRPORT)
/** Inside the M-30 or at the airport: the places a fixed-price transfer runs between. */
export const inPriceZone = (point: LatLng) => insideM30(point) || atAirport(point)

/** One sample of the straight line every this many metres, enough to place a journey to within a few hundred metres. */
const SAMPLE_M = 250

/**
 * How many of a journey's `roadM` metres lie beyond the price zone.
 *
 * Within the zone (both ends inside the M-30 or at the airport) it is 0. Otherwise the straight
 * line between the two places is followed: the share of it outside the M-30 and the airport is
 * applied to the road distance. Without a routing server the road itself is not known, and the
 * straight line crosses the zone where the road does, give or take a short stretch.
 */
export function metresBeyondZone(from: LatLng, to: LatLng, roadM: number): number {
  if (inPriceZone(from) && inPriceZone(to)) return 0
  const samples = Math.max(2, Math.ceil(haversineM(from, to) / SAMPLE_M))
  let outside = 0
  for (let i = 0; i < samples; i++) {
    const t = (i + 0.5) / samples
    if (!inPriceZone({ lat: from.lat + (to.lat - from.lat) * t, lng: from.lng + (to.lng - from.lng) * t })) outside++
  }
  return Math.round((roadM * outside) / samples)
}
