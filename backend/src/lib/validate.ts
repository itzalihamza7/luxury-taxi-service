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
