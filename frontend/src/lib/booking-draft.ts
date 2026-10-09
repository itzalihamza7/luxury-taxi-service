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

/** Changing any of these means the price has to be worked out again. */
export const RIDE_FIELDS: (keyof Draft)[] = ['rideType', 'pickup', 'dropoff', 'date', 'time', 'returnDate', 'returnTime', 'hours', 'adults', 'children', 'luggage']

const placeLabel = (place: Place) => (place.sublabel ? `${place.label}, ${place.sublabel}` : place.label)
const toPoint = (place: Place) => ({ label: placeLabel(place), lat: place.lat, lng: place.lng })

/** The journey of a draft, as the API prices it. */
export function quoteRequest(draft: Draft) {
  return {
    rideType: draft.rideType,
    pickup: draft.pickup ? toPoint(draft.pickup) : null,
    dropoff: draft.dropoff ? toPoint(draft.dropoff) : null,
    pickupDate: draft.date,
    pickupTime: draft.time,
    returnDate: draft.rideType === 'return' ? draft.returnDate : null,
    returnTime: draft.rideType === 'return' ? draft.returnTime : null,
    hours: draft.rideType === 'hourly' ? draft.hours : null,
    adults: draft.adults,
    children: draft.children,
    luggage: draft.luggage,
  }
}

/** What is still missing before the journey can be priced, as field error codes. */
export function validateRide(draft: Draft): Record<string, string> {
  const errors: Record<string, string> = {}
  if (!draft.pickup) errors.pickup = 'select_place'
  if (draft.rideType !== 'hourly' && !draft.dropoff) errors.dropoff = 'select_place'
  if (!draft.date) errors.pickupDate = 'required'
  if (!draft.time) errors.pickupTime = 'required'
  if (draft.rideType === 'return') {
    if (!draft.returnDate) errors.returnDate = 'required'
    if (!draft.returnTime) errors.returnTime = 'required'
  }
  return errors
}

/** The API reports `pickup.lat` and the like; the form shows one message per location field. */
export function normalizeFields(fields: Record<string, string>): Record<string, string> {
  const errors: Record<string, string> = {}
  for (const [key, code] of Object.entries(fields)) {
    const field = key.startsWith('pickup.') ? 'pickup' : key.startsWith('dropoff.') ? 'dropoff' : key
    errors[field] ??= field === 'pickup' || field === 'dropoff' ? (code === 'required' ? 'select_place' : code) : code
  }
  return errors
}

/** Drop the errors of the fields that were just edited. The form and the API name some of them differently. */
export function clearFieldErrors(errors: Record<string, string | undefined>, changed: (keyof Draft)[]): Record<string, string | undefined> {
  const next = { ...errors }
  for (const key of changed) {
    delete next[key === 'date' ? 'pickupDate' : key === 'time' ? 'pickupTime' : key]
    if (key === 'contact') for (const field of Object.keys(next)) if (field.startsWith('contact.')) delete next[field]
    if (key === 'vehicleSlug') delete next.vehicle
    if (key === 'adults' || key === 'children') delete next.adults
  }
  return next
}
