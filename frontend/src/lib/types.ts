import type { Localized } from '@/i18n/config'

/** Shapes returned by the backend API. Keep in sync with the backend serializers. */

export type RideType = 'one_way' | 'return' | 'local' | 'hourly' | 'city_to_city' | 'airport'
export const RIDE_TYPES: RideType[] = ['one_way', 'return', 'local', 'hourly', 'city_to_city', 'airport']

export type VehicleCategory = 'economy' | 'sedan' | 'van' | 'group' | 'flagship'
export type BodyType = 'hatchback' | 'sedan' | 'limousine' | 'van' | 'minibus'

export interface Vehicle {
  id: string
  slug: string
  name: string
  category: VehicleCategory
  bodyType: BodyType
  passengers: number
  luggage: number
  tagline: Localized
  description: Localized
  highlights: Localized<string[]>
  imageUrl: string | null
  fromCents: number
  hourlyRateCents: number
}

export type PlaceKind = 'airport' | 'station' | 'venue' | 'landmark' | 'city' | 'address'

export interface Place {
  id: string
  kind: PlaceKind
  label: string
  sublabel: string
  lat: number
  lng: number
}

export interface RouteInfo {
  distanceM: number
  durationS: number
  source: 'road' | 'estimate' | null
}

export interface QuoteOption {
  vehicleId: string
  totalCents: number
  available: boolean
  reason?: 'passengers' | 'luggage'
  vehicle: Vehicle
}

export interface Quote {
  id: string
  expiresAt: string
  rideType: RideType
  pickupAt: string
  returnAt: string | null
  hours: number | null
  route: RouteInfo | null
  currency: string
  options: QuoteOption[]
}

export type BookingStatus = 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled'
export type PaymentMethod = 'chauffeur' | 'online'
export type PaymentStatus = 'unpaid' | 'paid'

export interface Booking {
  reference: string
  status: BookingStatus
  rideType: RideType
  pickup: { label: string; lat: number; lng: number }
  dropoff: { label: string; lat: number; lng: number } | null
  pickupAt: string
  returnAt: string | null
  hours: number | null
  flightNumber: string | null
  adults: number
  children: number
  luggage: number
  vehicleName: string
  route: RouteInfo | null
  totalCents: number
  currency: string
  paymentMethod: PaymentMethod
  paymentStatus: PaymentStatus
  contact: { name: string; email: string; phone: string; company: string | null; notes: string | null }
  isGuest: boolean
  canCancel: boolean
  createdAt: string
}

export interface User {
  id: string
  email: string
  name: string
  phone: string | null
  role: 'customer' | 'admin'
}

export interface AppConfig {
  currency: string
  timeZone: string
  minLeadMinutes: number
  freeCancelHours: number
  quoteTtlMinutes: number
  onlinePayments: boolean
  limits: { maxPassengers: number; maxLuggage: number; minHours: number; maxHours: number; maxAdvanceDays: number; maxDistanceKm: number }
}

/** Used until `/api/config` answers, and if it cannot be reached. Mirrors the backend defaults. */
export const DEFAULT_CONFIG: AppConfig = {
  currency: 'EUR',
  timeZone: 'Europe/Madrid',
  minLeadMinutes: 120,
  freeCancelHours: 24,
  quoteTtlMinutes: 30,
  onlinePayments: false,
  limits: { maxPassengers: 16, maxLuggage: 16, minHours: 2, maxHours: 12, maxAdvanceDays: 365, maxDistanceKm: 1500 },
}

/*
 * Editable website content. These mirror the backend's rules for each kind of
 * entry (`backend/src/modules/content/schemas.ts`).
 */

export interface Question {
  question: string
  answer: string
}

/** A block of text: an optional heading, paragraphs and an optional bullet list. */
export interface TextSection {
  heading?: string
  paragraphs: string[]
  list?: string[]
}

interface Entry {
  id: string
  /** Last part of the page address. */
  slug: string
}

export interface Service extends Entry {
  /** The ride type preselected when booking from this service's page. */
  rideType: RideType
  icon: 'plane' | 'clock' | 'city' | 'route' | 'map'
  title: Localized
  /** One or two sentences for cards and search results. */
  summary: Localized
  /** Page heading; `*word*` marks the italic accent. */
  heading: Localized
  intro: Localized<string[]>
  includes: Localized<string[]>
  idealFor: Localized<string[]>
  /** Slugs of the vehicles recommended for this service, in order. */
  vehicles: string[]
  faqs: Localized<Question[]>
  image: string | null
}

export interface RouteGuide extends Entry {
  /** Place id used to prefill the booking form's drop-off. */
  destinationId: string | null
  city: Localized
  /** Road distance and typical drive time from central Madrid. */
  km: number
  minutes: number
  road: string
  summary: Localized
  heading: Localized
  intro: Localized
  journey: Localized<string[]>
  highlights: Localized<string[]>
  /** An honest comparison: when the train wins, and when the car does. */
  train: Localized
  car: Localized
  vehicles: string[]
  faqs: Localized<Question[]>
  image: string | null
}

export interface EventGuide extends Entry {
  /** Short label above the title, e.g. "Trade fair". */
  category: Localized
  title: Localized
  venue: string
  /** Place id used to prefill the booking form's drop-off. */
  placeId: string | null
  /** Dates as announced by the organiser (`YYYY-MM-DD`). */
  start: string
  end: string
  summary: Localized
  heading: Localized
  body: Localized<string[]>
  tips: Localized<string[]>
  image: string | null
}

export interface Article extends Entry {
  /** Publication date, `YYYY-MM-DD`. */
  date: string
  minutes: number
  category: Localized
  title: Localized
  excerpt: Localized
  body: Localized<TextSection[]>
  /** Where the "book this" button at the end of the article leads. */
  cta: { href: string; label: Localized }
  image: string | null
}

export interface Faq extends Entry {
  question: Localized
  answer: Localized
  /** Shown on the home page as well as the FAQ page. */
  featured: boolean
}

export interface Review extends Entry {
  quote: Localized
  author: Localized
  context: Localized
}

export interface LegalDocument extends Entry {
  title: Localized
  summary: Localized
  /** `YYYY-MM-DD` */
  updated: string
  /** May contain `{companyName}`-style placeholders for the business details. */
  sections: Localized<TextSection[]>
}

/** Which type each collection holds. */
export interface ContentMap {
  service: Service
  route: RouteGuide
  event: EventGuide
  article: Article
  faq: Faq
  review: Review
  legal: LegalDocument
}

export type Collection = keyof ContentMap

/** Business details, edited in the console. */
export interface SiteSettings {
  phone: string
  /** Digits only, with country code. */
  whatsapp: string
  email: string
  /** An empty link hides its icon. */
  social: { instagram: string; facebook: string; tripadvisor: string; google: string }
  legal: { companyName: string; taxId: string; address: string; registry: string; licence: string }
  /** While true, the reviews section says that the reviews are samples. */
  reviewsAreSamples: boolean
}
