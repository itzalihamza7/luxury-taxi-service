import { CircleAlert } from 'lucide-react'
import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'

export const labelClass = 'mb-2 block text-xs font-semibold tracking-[0.08em] text-ink-900/70 uppercase'

/** `text-base` (16px) on small screens stops iOS from zooming in on focus. */
export const controlClass =
  'w-full rounded-md border bg-white px-4 text-base text-ink-900 transition-colors placeholder:text-ink-900/60 focus:border-gold-600 focus:outline-none focus:ring-2 focus:ring-gold-400/30 disabled:bg-ink-900/5 disabled:text-ink-900/60 sm:text-[0.9375rem]'

export const borderClass = (invalid: boolean) => (invalid ? 'border-red-500' : 'border-ink-900/15 hover:border-ink-900/30')

interface FieldProps {
  id: string
  label: string
  hint?: string
  error?: string
  /** Shown beside the label, e.g. "optional". */
  note?: string
  className?: string
  children: ReactNode
}

/** Label, control, hint and error message wired together for assistive technology. */
export function Field({ id, label, hint, error, note, className = '', children }: FieldProps) {
  return (
    <div className={className}>
      <label htmlFor={id} className={labelClass}>
        {label}
        {note ? <span className="ml-2 font-normal tracking-normal text-ink-900/60 normal-case">({note})</span> : null}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} role="alert" className="mt-2 flex items-start gap-1.5 text-sm text-red-600">
          <CircleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-2 text-sm text-ink-900/60">
          {hint}
        </p>
      ) : null}
    </div>
  )
}

/** `aria-*` attributes that connect a control to its Field's hint or error. */
export function describedBy(id: string, error?: string, hint?: string) {
  return {
    'aria-invalid': error ? (true as const) : undefined,
    'aria-describedby': error ? `${id}-error` : hint ? `${id}-hint` : undefined,
  }
}

type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> & Omit<FieldProps, 'children'>

export function TextField({ id, label, hint, error, note, className, ...input }: InputProps) {
  return (
    <Field id={id} label={label} hint={hint} error={error} note={note} className={className}>
      <input id={id} className={`${controlClass} h-12 ${borderClass(Boolean(error))}`} {...describedBy(id, error, hint)} {...input} />
    </Field>
  )
}

type SelectProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, 'id'> & Omit<FieldProps, 'children'> & { children: ReactNode }

export function SelectField({ id, label, hint, error, note, className, children, ...select }: SelectProps) {
  return (
    <Field id={id} label={label} hint={hint} error={error} note={note} className={className}>
      <select id={id} className={`${controlClass} h-12 appearance-none bg-[length:1rem] bg-[right_1rem_center] bg-no-repeat pr-10 ${borderClass(Boolean(error))}`} style={{ backgroundImage: CHEVRON }} {...describedBy(id, error, hint)} {...select}>
        {children}
      </select>
    </Field>
  )
}

type TextareaProps = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'id'> & Omit<FieldProps, 'children'>

export function TextareaField({ id, label, hint, error, note, className, ...textarea }: TextareaProps) {
  return (
    <Field id={id} label={label} hint={hint} error={error} note={note} className={className}>
      <textarea id={id} rows={4} className={`${controlClass} py-3 leading-relaxed ${borderClass(Boolean(error))}`} {...describedBy(id, error, hint)} {...textarea} />
    </Field>
  )
}

const CHEVRON = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%230d0f13' stroke-width='1.75' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`

/** Inline message for the result of submitting a form. */
export function FormMessage({ tone, children }: { tone: 'error' | 'success'; children: ReactNode }) {
  const styles = tone === 'error' ? 'border-red-200 bg-red-50 text-red-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'
  return (
    <p role={tone === 'error' ? 'alert' : 'status'} className={`rounded-md border px-4 py-3 text-sm ${styles}`}>
      {children}
    </p>
  )
}
