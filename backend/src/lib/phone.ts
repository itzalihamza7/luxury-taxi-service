import { sql, type SQL } from 'drizzle-orm'
import type { AnyPgColumn } from 'drizzle-orm/pg-core'

/*
 * Phone numbers are written in many ways: "+34 600 111 222", "0034600111222",
 * "600 111 222". These helpers compare them as the same subscriber.
 */

/** The digits of a number, without an international "00" prefix. */
export const phoneDigits = (phone: string): string => phone.replace(/\D/g, '').replace(/^00/, '')

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
