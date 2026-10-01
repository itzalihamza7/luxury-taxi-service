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
