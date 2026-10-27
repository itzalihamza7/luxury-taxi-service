'use client'

import { Building2, Landmark, LoaderCircle, MapPin, Plane, TrainFront, X, type LucideIcon } from 'lucide-react'
import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { borderClass, controlClass, Field } from '@/components/ui/Field'
import { useI18n } from '@/i18n/client'
import type { Locale } from '@/i18n/config'
import type { BookingMessages } from '@/i18n/messages/booking'
import { api, isAbort } from '@/lib/api'
import type { Place, PlaceKind } from '@/lib/types'

const ICONS: Record<PlaceKind, LucideIcon> = {
  airport: Plane,
  station: TrainFront,
  venue: Building2,
  landmark: Landmark,
  city: Building2,
  address: MapPin,
}

/** Quick picks are the same for everyone, so they are fetched once per language and shared. */
const quickPicks = new Map<Locale, Promise<Place[]>>()

function loadQuickPicks(locale: Locale): Promise<Place[]> {
  let pending = quickPicks.get(locale)
  if (!pending) {
    pending = api<{ places: Place[] }>(`/places?locale=${locale}`)
      .then((result) => result.places)
      .catch(() => {
        quickPicks.delete(locale)
        return []
      })
    quickPicks.set(locale, pending)
  }
  return pending
}

/** Find a quick-pick place by id (used to prefill the form from a link). */
export async function findPlace(id: string, locale: Locale): Promise<Place | null> {
  const places = await loadQuickPicks(locale)
  return places.find((place) => place.id === id) ?? null
}

interface Props {
  id: string
  label: string
  note?: string
  value: Place | null
  onChange: (place: Place | null) => void
  t: BookingMessages['ride']
  error?: string
  /** Kinds of place to list first among the quick picks (airports for an airport ride, and so on). */
  prefer?: PlaceKind[]
}

/**
 * Location search with suggestions (an accessible combobox). A location has to
 * be chosen from the list: that is what gives us the coordinates to price the ride.
 */
export function PlaceInput({ id, label, note, value, onChange, t, error, prefer = [] }: Props) {
  const { locale } = useI18n()
  const listId = useId()
  const input = useRef<HTMLInputElement>(null)

  const [text, setText] = useState('')
  const [open, setOpen] = useState(false)
  const [quick, setQuick] = useState<Place[]>([])
  const [results, setResults] = useState<Place[]>([])
  const [searching, setSearching] = useState(false)
  const [active, setActive] = useState(-1)

  const query = text.trim()
  const isSearch = !value && query.length >= 2

  // Search as the customer types, waiting briefly so each keystroke is not a request.
  useEffect(() => {
    if (!isSearch) return
    const controller = new AbortController()
    const timer = window.setTimeout(() => {
      setSearching(true)
      api<{ places: Place[] }>(`/places?q=${encodeURIComponent(query)}&locale=${locale}`, { signal: controller.signal })
        .then((result) => {
          setResults(result.places)
          setActive(result.places.length > 0 ? 0 : -1)
          setSearching(false)
        })
        .catch((caught) => {
          if (isAbort(caught)) return
          setResults([])
          setSearching(false)
        })
    }, 250)
    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [isSearch, query, locale])

  const rank = (place: Place) => {
    const index = prefer.indexOf(place.kind)
    return index === -1 ? prefer.length : index
  }
  const options = value ? [] : isSearch ? results : [...quick].sort((a, b) => rank(a) - rank(b)).slice(0, 8)
  const showList = open && !value

  const choose = (place: Place) => {
    onChange(place)
    setText('')
    setOpen(false)
    setActive(-1)
  }

  const onFocus = () => {
    setOpen(true)
    if (quick.length === 0) void loadQuickPicks(locale).then(setQuick)
  }

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      if (!showList) return setOpen(true)
      if (options.length === 0) return
      const step = event.key === 'ArrowDown' ? 1 : -1
      setActive((current) => (current + step + options.length) % options.length)
    } else if (event.key === 'Enter') {
      const option = options[active]
      if (showList && option) {
        event.preventDefault()
        choose(option)
      }
    } else if (event.key === 'Escape') {
      // A search field clears itself on Escape; here Escape only closes the list.
      event.preventDefault()
      setOpen(false)
    }
  }

  return (
    <Field id={id} label={label} note={note} error={error}>
      <div className="relative">
        <MapPin aria-hidden className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-gold-600" />
        {/* A search field named "...search": phones ignore autocomplete="off" for anything that looks
            like an address and offered the visitor's own saved addresses (UK ones) over our Spanish list. */}
        <input
          ref={input}
          id={id}
          type="search"
          name="placeSearch"
          role="combobox"
          autoComplete="off"
          spellCheck={false}
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={showList && active >= 0 ? `${listId}-${active}` : undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          placeholder={t.placeholder}
          value={value ? value.label : text}
          onChange={(event) => {
            // Typing over a chosen place starts a new search.
            if (value) onChange(null)
            setText(event.target.value)
            setActive(-1)
            setOpen(true)
          }}
          onFocus={onFocus}
          onBlur={() => setOpen(false)}
          onKeyDown={onKeyDown}
          className={`${controlClass} h-12 appearance-none truncate pl-11 pr-11 [&::-webkit-search-cancel-button]:appearance-none ${borderClass(Boolean(error))}`}
        />
        {searching && isSearch ? (
          <LoaderCircle aria-hidden className="absolute right-4 top-1/2 size-4 -translate-y-1/2 animate-spin text-ink-900/60" />
        ) : value ? (
          <button
            type="button"
            aria-label={`${t.clear}: ${label}`}
            onClick={() => {
              onChange(null)
              setText('')
              input.current?.focus()
            }}
            className="absolute right-2 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full text-ink-900/60 hover:bg-ink-900/5 hover:text-ink-900"
          >
            <X aria-hidden className="size-4" />
          </button>
        ) : null}

        <div
          hidden={!showList}
          className="absolute inset-x-0 top-full z-30 mt-2 overflow-hidden rounded-md border border-ink-900/10 bg-white shadow-[0_24px_48px_-16px_rgba(13,15,19,0.3)]"
        >
          {!isSearch && options.length > 0 ? <p className="eyebrow px-4 pb-1 pt-4 text-ink-900/60">{t.quickPicks}</p> : null}
          <ul id={listId} role="listbox" aria-label={label} className="max-h-72 overflow-y-auto py-1.5">
            {options.map((place, index) => {
              const Icon = ICONS[place.kind]
              return (
                <li
                  key={place.id}
                  id={`${listId}-${index}`}
                  role="option"
                  aria-selected={index === active}
                  // Keep focus in the input so choosing does not blur it first. On mousedown, not
                  // pointerdown: iPhones still send mousedown after a cancelled pointerdown, and its
                  // blur closed the list before the tap's click arrived.
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => choose(place)}
                  onMouseEnter={() => setActive(index)}
                  className={`flex cursor-pointer items-start gap-3 px-4 py-2.5 ${index === active ? 'bg-bone-100' : ''}`}
                >
                  <Icon aria-hidden strokeWidth={1.5} className="mt-0.5 size-4 shrink-0 text-gold-600" />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-ink-900">{place.label}</span>
                    {place.sublabel ? <span className="block truncate text-xs text-ink-900/60">{place.sublabel}</span> : null}
                  </span>
                </li>
              )
            })}
          </ul>
          {isSearch && !searching && options.length === 0 ? <p className="px-4 pb-4 pt-1 text-sm text-ink-900/60">{t.noResults}</p> : null}
          {isSearch && searching && options.length === 0 ? <p className="px-4 pb-4 pt-1 text-sm text-ink-900/60">{t.searching}</p> : null}
          {isSearch && options.some((place) => place.kind === 'address') ? (
            <p className="border-t border-ink-900/10 px-4 py-2 text-[0.6875rem] text-ink-900/60">{t.attribution}</p>
          ) : null}
        </div>
      </div>
    </Field>
  )
}
