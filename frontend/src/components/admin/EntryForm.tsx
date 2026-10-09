'use client'

import { ImagePlus, Trash2 } from 'lucide-react'
import { useId, useRef, useState, type ReactNode } from 'react'
import { Button } from '@/components/ui/Button'
import { borderClass, controlClass, FormMessage, labelClass } from '@/components/ui/Field'
import { useI18n } from '@/i18n/client'
import { fill, locales, type Locale, type Localized } from '@/i18n/config'
import type { ManageMessages } from '@/i18n/messages/manage'
import { ApiError, errorMessage, fieldMessage, uploadImage } from '@/lib/api'
import { linesToText, paragraphsToText, questionsToText, sectionsToText, textToLines, textToParagraphs, textToQuestions, textToSections } from '@/lib/markup'
import type { Question, TextSection } from '@/lib/types'

/*
 * One form for everything the console edits: vehicles, content entries and the
 * business details. A form is described by a list of fields (see
 * `definitions.ts`); each field reads and writes one value of the draft, found
 * by its path (`name`, `data.title`, `social.instagram`).
 */

export type Draft = Record<string, unknown>
type Errors = Record<string, string>

interface Option {
  value: string
  label: string
}

type FieldKind =
  | { kind: 'heading' }
  /** A short text. `localized` shows one input per language; `multiline` a text area. */
  | { kind: 'text'; localized?: boolean; multiline?: boolean; rows?: number; placeholder?: string }
  /** Lists and long texts in both languages, written as plain text (see `lib/markup.ts`). */
  | { kind: 'lines' | 'paragraphs' | 'sections' | 'questions'; rows?: number }
  | { kind: 'number'; min?: number; max?: number }
  /** Euros in the form, cents in the draft. */
  | { kind: 'money' }
  | { kind: 'date' }
  | { kind: 'select'; options: Option[]; empty?: string }
  | { kind: 'boolean' }
  | { kind: 'image' }
  /** Several of `options`, kept in the order they are listed. */
  | { kind: 'choices'; options: Option[] }

export type FieldDef = { path: string; label: string; hint?: string } & FieldKind

export const heading = (label: string, hint?: string): FieldDef => ({ kind: 'heading', path: '', label, hint })

function getAt(draft: Draft, path: string): unknown {
  let current: unknown = draft
  for (const key of path.split('.')) {
    if (current === null || typeof current !== 'object') return undefined
    current = (current as Draft)[key]
  }
  return current
}

function setAt(draft: Draft, path: string, value: unknown): Draft {
  const [key = '', ...rest] = path.split('.')
  if (rest.length === 0) return { ...draft, [key]: value }
  const child = draft[key]
  return { ...draft, [key]: setAt(child !== null && typeof child === 'object' ? (child as Draft) : {}, rest.join('.'), value) }
}

/** The error at `path`, or the first one somewhere beneath it (`tagline` matches `tagline.es`). */
function errorAt(errors: Errors, path: string): string | undefined {
  if (errors[path]) return errors[path]
  const nested = Object.keys(errors).find((key) => key.startsWith(`${path}.`))
  return nested ? errors[nested] : undefined
}

const TEXT_FORMATS = {
  lines: { toText: linesToText, fromText: textToLines },
  paragraphs: { toText: paragraphsToText, fromText: textToParagraphs },
  sections: { toText: (value: unknown[]) => sectionsToText(value as TextSection[]), fromText: textToSections },
  questions: { toText: (value: unknown[]) => questionsToText(value as Question[]), fromText: textToQuestions },
} as const

const inputClass = (invalid: boolean) => `${controlClass} h-11 ${borderClass(invalid)}`
const areaClass = (invalid: boolean) => `${controlClass} py-3 leading-relaxed ${borderClass(invalid)}`
const problem = 'mt-1.5 text-sm text-red-600'
const note = 'mt-2 text-sm leading-relaxed text-ink-900/60'

/** Marks which language an input holds. */
function Language({ locale }: { locale: Locale }) {
  return (
    <span aria-hidden className="pointer-events-none absolute right-2.5 top-2.5 rounded bg-ink-900/5 px-1.5 py-0.5 text-[0.625rem] font-semibold tracking-wider text-ink-900/60 uppercase">
      {locale}
    </span>
  )
}

/** A value that exists in both languages: the two inputs side by side. */
function Bilingual({ id, def, errors, render }: { id: string; def: FieldDef; errors: Errors; render: (locale: Locale, id: string, invalid: boolean) => ReactNode }) {
  const { t } = useI18n()
  return (
    <fieldset className="col-span-full min-w-0">
      <legend className={labelClass}>{def.label}</legend>
      <div className="grid gap-3 lg:grid-cols-2">
        {locales.map((locale) => {
          const error = fieldMessage(errorAt(errors, `${def.path}.${locale}`), t)
          return (
            <div key={locale} className="min-w-0">
              <div className="relative">
                {render(locale, `${id}-${locale}`, Boolean(error))}
                <Language locale={locale} />
              </div>
              {error ? (
                <p role="alert" className={problem}>
                  {error}
                </p>
              ) : null}
            </div>
          )
        })}
      </div>
      {def.hint ? <p className={note}>{def.hint}</p> : null}
    </fieldset>
  )
}

/** Lists and long texts, typed as plain text and stored structured. */
function TextFormatField({ id, def, value, errors, onChange }: { id: string; def: FieldDef & { kind: keyof typeof TEXT_FORMATS; rows?: number }; value: unknown; errors: Errors; onChange: (value: Localized<unknown[]>) => void }) {
  const format = TEXT_FORMATS[def.kind]
  const stored = (value ?? { en: [], es: [] }) as Localized<unknown[]>
  // What was typed is kept as typed; re-deriving it from the stored value would rewrite the text under the cursor.
  const [text, setText] = useState<Localized>(() => ({ en: format.toText((stored.en ?? []) as never), es: format.toText((stored.es ?? []) as never) }))

  return (
    <Bilingual
      id={id}
      def={def}
      errors={errors}
      render={(locale, fieldId, invalid) => (
        <textarea
          id={fieldId}
          lang={locale}
          rows={def.rows ?? 5}
          value={text[locale]}
          aria-label={`${def.label} (${locale})`}
          aria-invalid={invalid || undefined}
          onChange={(event) => {
            const next = { ...text, [locale]: event.target.value }
            setText(next)
            onChange({ en: format.fromText(next.en), es: format.fromText(next.es) })
          }}
          className={`${areaClass(invalid)} pr-12 font-mono text-[0.8125rem] sm:text-[0.8125rem]`}
        />
      )}
    />
  )
}

const MAX_SIDE = 1920

/** Shrinks a picture to a sensible size for the web and turns it into a JPEG. */
async function prepareImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  const context = canvas.getContext('2d')
  if (!context) throw new Error('canvas unavailable')
  // JPEG has no transparency: see-through areas become white rather than black.
  context.fillStyle = '#fff'
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  return new Promise((resolve, reject) => canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('encoding failed'))), 'image/jpeg', 0.86))
}

function ImageField({ id, def, value, error, m, onChange }: { id: string; def: FieldDef; value: unknown; error?: string; m: ManageMessages; onChange: (value: string | null) => void }) {
  const { t } = useI18n()
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [failure, setFailure] = useState<string | null>(null)
  const url = typeof value === 'string' && value ? value : null

  const choose = async (file: File | undefined) => {
    if (!file) return
    setBusy(true)
    setFailure(null)
    try {
      let image: Blob
      try {
        image = await prepareImage(file)
      } catch {
        setFailure(m.fleet.unreadable)
        return
      }
      onChange(await uploadImage(image))
    } catch (caught) {
      setFailure(errorMessage(caught, t))
    } finally {
      setBusy(false)
      if (input.current) input.current.value = ''
    }
  }

  return (
    <div className="col-span-full">
      <p className={labelClass}>{def.label}</p>
      <div className="flex flex-wrap items-center gap-5">
        <div className="flex aspect-[16/10] w-56 items-center justify-center overflow-hidden rounded-md border border-dashed border-ink-900/20 bg-ink-900/[0.03]">
          {url ? (
            // eslint-disable-next-line @next/next/no-img-element -- a preview of what was just uploaded
            <img src={url} alt="" className="size-full object-cover" />
          ) : (
            <ImagePlus aria-hidden strokeWidth={1.25} className="size-7 text-ink-900/30" />
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <input ref={input} id={id} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => void choose(event.target.files?.[0])} />
          <Button variant="outline" loading={busy} onClick={() => input.current?.click()}>
            {busy ? m.fleet.uploading : url ? m.fleet.replace : m.fleet.upload}
          </Button>
          {url && !busy ? (
            <button type="button" onClick={() => onChange(null)} className="inline-flex items-center gap-1.5 px-2 text-sm text-ink-900/60 underline-offset-4 hover:text-red-700 hover:underline">
              <Trash2 aria-hidden className="size-4" />
              {m.fleet.remove}
            </button>
          ) : null}
        </div>
      </div>
      {failure || error ? (
        <p role="alert" className={problem}>
          {failure ?? error}
        </p>
      ) : (
        <p className={note}>{def.hint ?? m.fleet.photoHint}</p>
      )}
    </div>
  )
}

function FieldControl({ def, draft, errors, m, formId, change }: { def: FieldDef; draft: Draft; errors: Errors; m: ManageMessages; formId: string; change: (path: string, value: unknown) => void }) {
  const { t } = useI18n()
  const id = `${formId}-${def.path.replaceAll('.', '-')}`
  const value = getAt(draft, def.path)
  const error = fieldMessage(errorAt(errors, def.path), t)
  const set = (next: unknown) => change(def.path, next)

  const single = (control: ReactNode, wide = false) => (
    <div className={wide ? 'col-span-full' : 'min-w-0'}>
      <label htmlFor={id} className={labelClass}>
        {def.label}
      </label>
      {control}
      {error ? (
        <p role="alert" className={problem}>
          {error}
        </p>
      ) : def.hint ? (
        <p className={note}>{def.hint}</p>
      ) : null}
    </div>
  )

  switch (def.kind) {
    case 'heading':
      return (
        <div className="col-span-full mt-4 border-t border-ink-900/10 pt-7 first:mt-0 first:border-0 first:pt-0">
          <h4 className="text-base font-semibold tracking-tight">{def.label}</h4>
          {def.hint ? <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-ink-900/60">{def.hint}</p> : null}
        </div>
      )

    case 'text': {
      if (def.localized) {
        const stored = (value ?? { en: '', es: '' }) as Localized
        return (
          <Bilingual
            id={id}
            def={def}
            errors={errors}
            render={(locale, fieldId, invalid) => {
              const shared = {
                id: fieldId,
                lang: locale,
                value: stored[locale] ?? '',
                'aria-label': `${def.label} (${locale})`,
                'aria-invalid': invalid || undefined,
                onChange: (event: { target: { value: string } }) => set({ ...stored, [locale]: event.target.value }),
              }
              return def.multiline ? <textarea rows={def.rows ?? 3} className={`${areaClass(invalid)} pr-12`} {...shared} /> : <input className={`${inputClass(invalid)} pr-12`} {...shared} />
            }}
          />
        )
      }
      return single(<input id={id} value={typeof value === 'string' ? value : ''} placeholder={def.placeholder} onChange={(event) => set(event.target.value)} aria-invalid={error ? true : undefined} className={inputClass(Boolean(error))} />)
    }

    case 'lines':
    case 'paragraphs':
    case 'sections':
    case 'questions':
      return <TextFormatField id={id} def={def} value={value} errors={errors} onChange={set} />

    case 'number':
      return single(
        <input
          id={id}
          type="number"
          inputMode="numeric"
          min={def.min}
          max={def.max}
          value={typeof value === 'number' && Number.isFinite(value) ? value : ''}
          onChange={(event) => set(event.target.value === '' ? null : Math.round(Number(event.target.value)))}
          aria-invalid={error ? true : undefined}
          className={inputClass(Boolean(error))}
        />,
      )

    case 'money':
      return <MoneyField id={id} def={def} cents={value} error={error} onChange={set} />

    case 'date':
      return single(<input id={id} type="date" value={typeof value === 'string' ? value : ''} onChange={(event) => set(event.target.value)} aria-invalid={error ? true : undefined} className={inputClass(Boolean(error))} />)

    case 'select':
      return single(
        <select id={id} value={typeof value === 'string' ? value : ''} onChange={(event) => set(event.target.value === '' && def.empty !== undefined ? null : event.target.value)} aria-invalid={error ? true : undefined} className={inputClass(Boolean(error))}>
          {def.empty !== undefined ? <option value="">{def.empty}</option> : null}
          {def.options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>,
      )

    case 'boolean':
      return (
        <div className="col-span-full">
          <label className="flex items-start gap-3">
            <input id={id} type="checkbox" checked={value === true} onChange={(event) => set(event.target.checked)} className="mt-0.5 size-5 shrink-0 accent-gold-600" />
            <span>
              <span className="font-medium">{def.label}</span>
              {def.hint ? <span className="mt-0.5 block text-sm leading-relaxed text-ink-900/60">{def.hint}</span> : null}
            </span>
          </label>
        </div>
      )

    case 'image':
      return <ImageField id={id} def={def} value={value} error={error} m={m} onChange={set} />

    case 'choices': {
      const chosen = Array.isArray(value) ? (value as string[]) : []
      return (
        <fieldset className="col-span-full min-w-0">
          <legend className={labelClass}>{def.label}</legend>
          <div className="flex flex-wrap gap-2">
            {def.options.map((option) => {
              const on = chosen.includes(option.value)
              return (
                <label key={option.value} className={`relative cursor-pointer rounded-full border px-4 py-2 text-sm transition-colors ${on ? 'border-ink-950 bg-ink-950 text-bone-50' : 'border-ink-900/15 bg-white hover:border-ink-900/40'}`}>
                  <input
                    type="checkbox"
                    checked={on}
                    className="sr-only"
                    onChange={(event) => {
                      const next = event.target.checked ? [...chosen, option.value] : chosen.filter((item) => item !== option.value)
                      // Kept in the order the options are listed, whatever order they were ticked in.
                      set(def.options.map((item) => item.value).filter((item) => next.includes(item)))
                    }}
                  />
                  {option.label}
                </label>
              )
            })}
          </div>
          {error ? (
            <p role="alert" className={problem}>
              {error}
            </p>
          ) : def.hint ? (
            <p className={note}>{def.hint}</p>
          ) : null}
        </fieldset>
      )
    }
  }
}

function MoneyField({ id, def, cents, error, onChange }: { id: string; def: FieldDef; cents: unknown; error?: string; onChange: (cents: number | null) => void }) {
  // The text is kept as typed ("60.5"), and stored in cents.
  const [text, setText] = useState(() => (typeof cents === 'number' ? String(cents / 100) : ''))
  return (
    <div className="min-w-0">
      <label htmlFor={id} className={labelClass}>
        {def.label}
      </label>
      <input
        id={id}
        inputMode="decimal"
        value={text}
        onChange={(event) => {
          setText(event.target.value)
          const amount = Number(event.target.value.replace(',', '.'))
          onChange(event.target.value.trim() === '' || !Number.isFinite(amount) ? null : Math.round(amount * 100))
        }}
        aria-invalid={error ? true : undefined}
        className={inputClass(Boolean(error))}
      />
      {error ? (
        <p role="alert" className={problem}>
          {error}
        </p>
      ) : null}
    </div>
  )
}

interface Props {
  title: string
  fields: FieldDef[]
  initial: Draft
  m: ManageMessages
  /** Saves the draft. Throwing an `ApiError` shows its message and marks the fields it names. */
  onSave: (draft: Draft) => Promise<void>
  onCancel?: () => void
  /** Shown as a "Delete" action; the name is used in the question that confirms it. */
  onDelete?: { name: string; run: () => Promise<void> }
}

export function EntryForm({ title, fields, initial, m, onSave, onCancel, onDelete }: Props) {
  const { t } = useI18n()
  const [draft, setDraft] = useState<Draft>(initial)
  const [errors, setErrors] = useState<Errors>({})
  const [message, setMessage] = useState<{ tone: 'error' | 'success'; text: string } | null>(null)
  const [busy, setBusy] = useState<'save' | 'delete' | null>(null)
  const formId = useId()

  const run = async (kind: 'save' | 'delete', action: () => Promise<void>, done?: string) => {
    setBusy(kind)
    setMessage(null)
    setErrors({})
    try {
      await action()
      if (done) setMessage({ tone: 'success', text: done })
    } catch (caught) {
      if (caught instanceof ApiError) setErrors(caught.fields)
      setMessage({ tone: 'error', text: errorMessage(caught, t) })
    } finally {
      setBusy(null)
    }
  }

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault()
        void run('save', () => onSave(draft), m.saved)
      }}
      className="rounded-xl border border-ink-900/10 bg-white p-5 shadow-[0_1px_2px_rgba(12,18,27,0.04)] sm:p-8"
    >
      <h3 className="text-xl font-semibold tracking-tight">{title}</h3>

      <div className="mt-7 grid gap-x-5 gap-y-6 sm:grid-cols-2 lg:grid-cols-4">
        {fields.map((def, index) => (
          <FieldControl key={def.path || `heading-${index}`} def={def} draft={draft} errors={errors} m={m} formId={formId} change={(path, value) => setDraft((current) => setAt(current, path, value))} />
        ))}
      </div>

      {message ? (
        <div className="mt-7">
          <FormMessage tone={message.tone}>{message.text}</FormMessage>
        </div>
      ) : null}

      <div className="mt-7 flex flex-wrap items-center gap-3 border-t border-ink-900/10 pt-6">
        <Button type="submit" variant="dark" loading={busy === 'save'} disabled={busy !== null}>
          {m.save}
        </Button>
        {onCancel ? (
          <Button variant="outline" disabled={busy !== null} onClick={onCancel}>
            {m.cancel}
          </Button>
        ) : null}
        {onDelete ? (
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => {
              if (window.confirm(fill(m.deleteConfirm, { name: onDelete.name }))) void run('delete', onDelete.run)
            }}
            className="ml-auto inline-flex items-center gap-1.5 px-2 text-sm font-medium text-red-700 underline-offset-4 hover:underline disabled:opacity-50"
          >
            <Trash2 aria-hidden className="size-4" />
            {m.delete}
          </button>
        ) : null}
      </div>
    </form>
  )
}
