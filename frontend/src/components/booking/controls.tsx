'use client'

import { Check, Minus, Plus } from 'lucide-react'
import { labelClass } from '@/components/ui/Field'
import { fill } from '@/i18n/config'
import type { BookingMessages } from '@/i18n/messages/booking'

/** Plus/minus control for small whole numbers (passengers, suitcases). */
export function Stepper({
  id,
  label,
  value,
  min,
  max,
  onChange,
  t,
}: {
  id: string
  label: string
  value: number
  min: number
  max: number
  onChange: (value: number) => void
  t: BookingMessages['ride']
}) {
  const button = 'flex size-12 items-center justify-center text-ink-900/70 transition-colors hover:bg-bone-100 hover:text-ink-900 disabled:opacity-30 disabled:hover:bg-transparent'
  return (
    <div>
      <span id={`${id}-label`} className={labelClass}>
        {label}
      </span>
      <div role="group" aria-labelledby={`${id}-label`} className="flex h-12 items-center justify-between overflow-hidden rounded-md border border-ink-900/15 bg-white">
        <button type="button" className={button} disabled={value <= min} onClick={() => onChange(value - 1)} aria-label={fill(t.decrease, { label })}>
          <Minus aria-hidden className="size-4" />
        </button>
        <output aria-live="polite" className="min-w-8 text-center text-base font-medium tabular-nums">
          {value}
        </output>
        <button type="button" className={button} disabled={value >= max} onClick={() => onChange(value + 1)} aria-label={fill(t.increase, { label })}>
          <Plus aria-hidden className="size-4" />
        </button>
      </div>
    </div>
  )
}

export type StepId = 'ride' | 'vehicle' | 'contact' | 'review' | 'payment'
export const STEP_ORDER: StepId[] = ['ride', 'vehicle', 'contact', 'review', 'payment']

/** Progress through the five steps. Completed steps are links back to themselves. */
export function StepIndicator({
  current,
  reached,
  onSelect,
  t,
}: {
  current: StepId
  /** The furthest step the customer has unlocked. */
  reached: StepId
  onSelect: (step: StepId) => void
  t: BookingMessages
}) {
  const currentIndex = STEP_ORDER.indexOf(current)
  const reachedIndex = STEP_ORDER.indexOf(reached)

  return (
    <nav aria-label={fill(t.stepOf, { current: currentIndex + 1, total: STEP_ORDER.length })}>
      <ol className="flex items-center">
        {STEP_ORDER.map((step, index) => {
          const done = index < currentIndex
          const active = index === currentIndex
          const available = index <= reachedIndex && !active
          return (
            <li key={step} className={`flex items-center ${index > 0 ? 'flex-1' : ''}`}>
              {index > 0 ? <span aria-hidden className={`mx-2 h-px flex-1 sm:mx-3 ${index <= currentIndex ? 'bg-gold-600' : 'bg-ink-900/15'}`} /> : null}
              <button
                type="button"
                disabled={!available}
                onClick={() => onSelect(step)}
                aria-current={active ? 'step' : undefined}
                className={`group flex items-center gap-2.5 rounded-full text-left ${available ? 'cursor-pointer' : 'cursor-default'}`}
              >
                <span
                  className={`flex size-8 shrink-0 items-center justify-center rounded-full border text-xs font-semibold transition-colors ${
                    active
                      ? 'border-ink-950 bg-ink-950 text-gold-300'
                      : done
                        ? 'border-gold-600 bg-gold-600 text-white group-hover:bg-gold-700'
                        : 'border-ink-900/20 text-ink-900/60'
                  }`}
                >
                  {done ? <Check aria-hidden className="size-4" /> : index + 1}
                </span>
                <span className={`hidden text-sm font-medium lg:block ${active ? 'text-ink-900' : 'text-ink-900/60'}`}>{t.steps[step]}</span>
              </button>
            </li>
          )
        })}
      </ol>
      {/* On small screens only the current step's name is shown. */}
      <p className="mt-4 text-sm font-medium text-ink-900 lg:hidden">
        <span className="text-ink-900/60">{fill(t.stepOf, { current: currentIndex + 1, total: STEP_ORDER.length })} · </span>
        {t.steps[current]}
      </p>
    </nav>
  )
}
