'use client'

import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/Button'
import { SelectField, TextField } from '@/components/ui/Field'
import { useI18n } from '@/i18n/client'
import { fill, href } from '@/i18n/config'
import type { BookingMessages } from '@/i18n/messages/booking'
import { fieldMessage } from '@/lib/api'
import { loadDraft, saveDraft } from '@/lib/booking-draft'
import { RIDE_TYPES, type Place, type RideType } from '@/lib/types'
import { PlaceInput } from './PlaceInput'

/**
 * The short form on the home page. It collects the journey, stores it as the
 * booking draft and opens the booking page straight on the prices.
 */
export function QuickQuote({ b }: { b: BookingMessages }) {
  const { t, locale } = useI18n()
  const router = useRouter()
  const r = b.ride

  const [rideType, setRideType] = useState<RideType>('one_way')
  const [pickup, setPickup] = useState<Place | null>(null)
  const [dropoff, setDropoff] = useState<Place | null>(null)
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [hours, setHours] = useState(3)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const hourly = rideType === 'hourly'

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const missing: Record<string, string> = {}
    if (!pickup) missing.pickup = 'select_place'
    if (!hourly && !dropoff) missing.dropoff = 'select_place'
    if (!date) missing.date = 'required'
    if (!time) missing.time = 'required'
    setErrors(missing)
    if (Object.keys(missing).length > 0) return

    // Keep anything already saved (contact details, passengers) and replace the journey.
    saveDraft({ ...loadDraft(), rideType, pickup, dropoff: hourly ? null : dropoff, date, time, hours })
    router.push(`${href(locale, '/booking')}?quote=1`)
  }

  return (
    <form onSubmit={submit} noValidate className="rounded-lg bg-bone-50 p-5 text-ink-900 shadow-[0_40px_80px_-30px_rgba(0,0,0,0.8)] sm:p-7">
      {/* A fieldset will not shrink below its content unless told to; min-w-0 lets the row scroll instead. */}
      <fieldset className="min-w-0">
        <legend className="sr-only">{r.type}</legend>
        <div className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1 [scrollbar-width:none]">
          {RIDE_TYPES.map((type) => (
            <label
              key={type}
              className={`relative cursor-pointer rounded-full px-3.5 py-2 text-xs font-semibold whitespace-nowrap transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-gold-500 ${
                rideType === type ? 'bg-ink-950 text-gold-300' : 'text-ink-900/60 hover:bg-ink-900/5 hover:text-ink-900'
              }`}
            >
              <input type="radio" name="quick-type" value={type} checked={rideType === type} onChange={() => setRideType(type)} className="sr-only" />
              {t.rideTypes[type]}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="mt-5 space-y-4">
        <PlaceInput id="quick-pickup" label={r.pickup} value={pickup} onChange={setPickup} t={r} error={fieldMessage(errors.pickup, t)} prefer={rideType === 'city_to_city' ? ['city'] : ['airport', 'station', 'landmark']} />
        {hourly ? (
          <SelectField id="quick-hours" label={r.hours} value={hours} onChange={(event) => setHours(Number(event.target.value))}>
            {Array.from({ length: 11 }, (_, index) => index + 2).map((count) => (
              <option key={count} value={count}>
                {fill(r.hoursOption, { count })}
              </option>
            ))}
          </SelectField>
        ) : (
          <PlaceInput
            id="quick-dropoff"
            label={r.dropoff}
            value={dropoff}
            onChange={setDropoff}
            t={r}
            error={fieldMessage(errors.dropoff, t)}
            prefer={rideType === 'city_to_city' || rideType === 'return' ? ['city'] : rideType === 'airport' ? ['airport', 'landmark'] : ['landmark', 'station', 'venue']}
          />
        )}
        <div className="grid grid-cols-2 gap-4">
          <TextField id="quick-date" type="date" label={r.date} value={date} onChange={(event) => setDate(event.target.value)} error={fieldMessage(errors.date, t)} />
          <TextField id="quick-time" type="time" step={300} label={r.time} value={time} onChange={(event) => setTime(event.target.value)} error={fieldMessage(errors.time, t)} />
        </div>
      </div>

      <Button type="submit" size="lg" arrow className="mt-6 w-full">
        {t.actions.seePrices}
      </Button>
      <p className="mt-3 text-center text-xs text-ink-900/60">{r.notice}</p>
    </form>
  )
}
