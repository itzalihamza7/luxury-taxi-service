import { sql, type SQL } from 'drizzle-orm'
import type { AnyPgColumn } from 'drizzle-orm/pg-core'

/*
 * Phone numbers are written in many ways: "+34 600 111 222", "0034600111222",
 * "600 111 222". These helpers compare them as the same subscriber.
 */

/**
 * A number as it was written, without what gets in the way of calling it: invisible marks from
 * copying it out of a contacts app, the "(0)" of "+49 (0) 151" (dialled only from inside the
 * country) and separators such as the slash of "0151/12345678", which become spaces.
 */
export function cleanPhone(phone: string): string {
  const visible = phone.normalize('NFKC').replace(/\p{Cf}/gu, '')
  const international = /^\s*(\+|00)/.test(visible)
  return (international ? visible.replace(/\(\s*0\s*\)/, ' ') : visible)
    .replace(/[/\\‐-―−]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** The digits of a number, without an international "00" prefix. */
export const phoneDigits = (phone: string): string => phone.replace(/\D/g, '').replace(/^00/, '')

/** Whether this looks like a phone number of any country: an E.164 number has at most 15 digits. */
export function isPhone(phone: string): boolean {
  const digits = phoneDigits(phone).length
  return /^\+?[\d\s().-]+$/.test(phone) && digits >= 7 && digits <= 15
}

/**
 * Whether two numbers are the same: equal digit for digit, or equal in their
 * last nine digits when one was written without its country code.
 */
export function samePhone(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false
  const first = phoneDigits(a)
  const second = phoneDigits(b)
  if (first.length < 7 || second.length < 7) return false
  if (first === second) return true
  return first.length >= 9 && second.length >= 9 && first.slice(-9) === second.slice(-9)
}

/** The same comparison as `samePhone`, as a database condition on a phone column. */
export function phoneMatches(column: AnyPgColumn, phone: string): SQL {
  const wanted = phoneDigits(phone)
  if (wanted.length < 7) return sql`false`
  const digits = sql`regexp_replace(regexp_replace(coalesce(${column}, ''), '\\D', '', 'g'), '^00', '')`
  if (wanted.length < 9) return sql`${digits} = ${wanted}`
  return sql`(${digits} = ${wanted} or (length(${digits}) >= 9 and right(${digits}, 9) = ${wanted.slice(-9)}))`
}
