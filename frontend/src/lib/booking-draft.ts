import type { PaymentMethod, Place, RideType } from './types'
import { RIDE_TYPES } from './types'

/**
 * The booking in progress. It is kept in the browser's localStorage so a
 * customer can leave and come back; nothing here is sent anywhere until they
 * ask for a price or confirm.
 */
export interface Draft {
  rideType: RideType
  pickup: Place | null
  dropoff: Place | null
  /** Local Madrid date and time, as form values (`YYYY-MM-DD`, `HH:mm`). */
  date: string
  time: string
  returnDate: string
  returnTime: string
  hours: number
  flightNumber: string
  adults: number
  children: number
  luggage: number
  /** Preferred vehicle, e.g. when arriving from a vehicle's page. */
  vehicleSlug: string | null
  contact: { name: string; email: string; phone: string; company: string; notes: string }
  paymentMethod: PaymentMethod
}

const KEY = 'booking-draft-v1'
/** Reference + email of the booking just made, so "track this booking" needs no retyping. */
const LAST_KEY = 'booking-last-v1'

export function emptyDraft(): Draft {
  return {
    rideType: 'one_way',
    pickup: null,
    dropoff: null,
    date: '',
    time: '',
    returnDate: '',
    returnTime: '',
    hours: 3,
    flightNumber: '',
    adults: 1,
    children: 0,
    luggage: 1,
    vehicleSlug: null,
    contact: { name: '', email: '', phone: '', company: '', notes: '' },
    paymentMethod: 'chauffeur',
  }
}

function isPlace(value: unknown): value is Place {
  const place = value as Place | null
  return Boolean(place) && typeof place?.label === 'string' && typeof place.lat === 'number' && typeof place.lng === 'number'
}

/** Read the saved draft, ignoring anything malformed (the stored shape may be from an older version). */
export function loadDraft(): Draft {
  const base = emptyDraft()
  try {
    const raw = window.localStorage.getItem(KEY)
    if (!raw) return base
    const saved = JSON.parse(raw) as Partial<Draft>

    return {
      ...base,
      rideType: RIDE_TYPES.includes(saved.rideType as RideType) ? (saved.rideType as RideType) : base.rideType,
      pickup: isPlace(saved.pickup) ? saved.pickup : null,
      dropoff: isPlace(saved.dropoff) ? saved.dropoff : null,
      date: typeof saved.date === 'string' ? saved.date : '',
      time: typeof saved.time === 'string' ? saved.time : '',
      returnDate: typeof saved.returnDate === 'string' ? saved.returnDate : '',
      returnTime: typeof saved.returnTime === 'string' ? saved.returnTime : '',
      hours: Number.isInteger(saved.hours) ? (saved.hours as number) : base.hours,
      flightNumber: typeof saved.flightNumber === 'string' ? saved.flightNumber : '',
      adults: Number.isInteger(saved.adults) ? (saved.adults as number) : base.adults,
      children: Number.isInteger(saved.children) ? (saved.children as number) : base.children,
      luggage: Number.isInteger(saved.luggage) ? (saved.luggage as number) : base.luggage,
      vehicleSlug: typeof saved.vehicleSlug === 'string' ? saved.vehicleSlug : null,
      contact: { ...base.contact, ...(typeof saved.contact === 'object' && saved.contact ? saved.contact : {}) },
      paymentMethod: saved.paymentMethod === 'online' ? 'online' : 'chauffeur',
    }
  } catch {
    return base
  }
}

export function saveDraft(draft: Draft): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(draft))
  } catch {
    // Storage unavailable (private browsing): the form still works, it just is not remembered.
  }
}

export function clearDraft(): void {
  try {
    window.localStorage.removeItem(KEY)
  } catch {
    // Nothing to clear.
  }
}

export function rememberBooking(reference: string, email: string): void {
  try {
    window.sessionStorage.setItem(LAST_KEY, JSON.stringify({ reference, email }))
  } catch {
    // Not essential.
  }
}

export function lastBooking(): { reference: string; email: string } | null {
  try {
    const raw = window.sessionStorage.getItem(LAST_KEY)
    return raw ? (JSON.parse(raw) as { reference: string; email: string }) : null
  } catch {
    return null
  }
}
