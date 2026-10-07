import { z } from 'zod'
import { HttpError } from './errors.js'

function valueAt(input: unknown, path: PropertyKey[]): unknown {
  let current = input
  for (const key of path) {
    if (current === null || typeof current !== 'object') return undefined
    current = (current as Record<PropertyKey, unknown>)[key]
  }
  return current
}

/** Collapse a Zod issue into a short code the frontend maps to a translated message. */
function issueCode(issue: z.core.$ZodIssue, input: unknown): string {
  const value = valueAt(input, issue.path)
  if (value === undefined || value === null || value === '') return 'required'

  switch (issue.code) {
    case 'custom':
      return issue.message || 'invalid'
    case 'too_small':
      return typeof value === 'string' ? 'too_short' : 'too_small'
    case 'too_big':
      return typeof value === 'string' ? 'too_long' : 'too_big'
    case 'invalid_format':
      return issue.format === 'email' ? 'invalid_email' : 'invalid'
    default:
      return 'invalid'
  }
}

/** Parse `input` with `schema`, or throw a 400 with per-field error codes. */
export function parse<T extends z.ZodType>(schema: T, input: unknown): z.infer<T> {
  const result = schema.safeParse(input)
  if (result.success) return result.data

  const fields: Record<string, string> = {}
  for (const issue of result.error.issues) {
    const key = issue.path.join('.') || '_'
    fields[key] ??= issueCode(issue, input)
  }
  throw new HttpError(400, 'VALIDATION', 'Please check the highlighted fields.', fields)
}

/** Shared field schemas. */
export const email = z.string().trim().toLowerCase().pipe(z.email().max(254))
export const personName = z.string().trim().min(2).max(100)
/** Digits with optional +, spaces, dashes, dots and brackets; 7-15 digits overall. */
export const phone = z
  .string()
  .trim()
  .max(30)
  .refine((value) => /^\+?[\d\s().-]+$/.test(value) && value.replace(/\D/g, '').length >= 7 && value.replace(/\D/g, '').length <= 15, {
    message: 'invalid_phone',
  })
export const locale = z.enum(['en', 'es']).default('en')

/** Optional free text: trims, and stores an empty value as null. */
export const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((value) => (value ? value : null))

/** Lower-case words joined by hyphens: the last part of a page address. */
export const slug = z
  .string()
  .trim()
  .min(2)
  .max(80)
  .refine((value) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value), { message: 'invalid_slug' })

/** Turn a title into a slug: "Clase S (2026)" -> "clase-s-2026". */
export function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/, '')
}

/** An image of this site: a file shipped with the website, or one uploaded in the console. */
export const imageUrl = z
  .string()
  .trim()
  .max(200)
  .refine((value) => /^\/(?:images\/[\w./-]+\.(?:jpe?g|png|webp|avif)|api\/media\/[0-9a-f-]{36})$/i.test(value) && !value.includes('..'), {
    message: 'invalid_image',
  })

/** Text in both languages. */
export const localizedText = (max: number) => z.object({ en: z.string().trim().min(1).max(max), es: z.string().trim().min(1).max(max) })

/** A list of short texts in both languages (bullet points, paragraphs). */
export const localizedLines = (max: number, maxItems = 20) => {
  const lines = z.array(z.string().trim().min(1).max(max)).max(maxItems)
  return z.object({ en: lines, es: lines })
}

/** A calendar date, `YYYY-MM-DD`. */
export const isoDate = z
  .string()
  .refine((value) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().startsWith(value), {
    message: 'invalid_date',
  })

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Whether `value` can be used as a row id (anything else would make the database query fail). */
export const isUuid = (value: unknown): value is string => typeof value === 'string' && UUID.test(value)
