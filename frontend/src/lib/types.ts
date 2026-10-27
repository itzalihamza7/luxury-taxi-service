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
  /** The fixed price inside the M-30 (and airport <-> M-30): the lowest transfer fare. */
  fromCents: number
  /** Null when hourly hire is agreed case by case. */
  hourlyRateCents: number | null
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
  /** Null when the price is agreed with the business after booking. */
  totalCents: number | null
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
/** `partly_paid`: an advance has been received, the rest is still due. */
export type PaymentStatus = 'unpaid' | 'partly_paid' | 'paid'

export type BookingEventKind = 'created' | 'edited' | 'status_changed' | 'payment_requested' | 'payment_proof' | 'payment_received' | 'payment_cancelled'

/** One field that changed: dates as ISO strings, prices in cents, the rest as shown. */
export interface BookingChange {
  field: string
  from: string | null
  to: string | null
}

/** A step in a booking's history. `actorName` is the team member; null for the customer or the website. */
export interface BookingEvent {
  id: string
  kind: BookingEventKind
  actorName: string | null
  changes: BookingChange[]
  note: string | null
  createdAt: string
}

/** A payment the team asked for, through their payment link. */
export interface BookingPayment {
  id: string
  kind: 'advance' | 'full' | 'balance'
  amountCents: number
  currency: string
  /** Only while it can be paid. */
  link: string | null
  status: 'requested' | 'paid' | 'cancelled'
  requestedAt: string
  /** When the customer uploaded proof of it ("Payment done"); the team then checks it. */
  proofUploadedAt: string | null
  paidAt: string | null
}

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
  /** Null until the business sets the price, when it is agreed with the customer. */
  totalCents: number | null
  currency: string
  paymentMethod: PaymentMethod
  paymentStatus: PaymentStatus
  /** A booking made on the website has both an email address and a phone number; one taken by phone may have only one. */
  contact: { name: string; email: string | null; phone: string | null; company: string | null; notes: string | null }
  isGuest: boolean
  /** `operator` when the business entered the booking for a customer who phoned or wrote. */
  source: 'website' | 'operator' | 'agent'
  canCancel: boolean
  createdAt: string
  /** On the booking's own page (and in the console): its history, newest first, and payment requests. */
  events?: BookingEvent[]
  payments?: BookingPayment[]
}

/** A booking as the team sees it in the console. */
export interface AdminBooking extends Booking {
  guestCode: string | null
  /** A customer has uploaded proof of a payment the team has not checked yet. */
  proofToCheck?: boolean
  payments?: (BookingPayment & { whatsappUrl: string | null; proofUrl: string | null })[]
}

export interface User {
  id: string
  email: string
  name: string
  phone: string | null
  /** `superadmin` can also appoint and remove other super admins. */
  role: UserRole
  /** Proved with a code by email; then the bookings made with this address join the account. */
  emailVerified: boolean
}

export type UserRole = 'customer' | 'admin' | 'superadmin'

/** Admins and super admins run the business and see the admin panel. */
export const isStaff = (user: Pick<User, 'role'> | null | undefined): boolean => user?.role === 'admin' || user?.role === 'superadmin'

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
  /** Whether bookings taken by phone join the account of a customer who signs up later with the same email or number. */
  linkBookingsOnSignup: boolean
}
