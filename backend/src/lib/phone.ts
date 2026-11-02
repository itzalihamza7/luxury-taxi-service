import { sql, type SQL } from 'drizzle-orm'
import type { AnyPgColumn } from 'drizzle-orm/pg-core'
import { parsePhoneNumberFromString, type PhoneNumber } from 'libphonenumber-js'

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

/** The business is in Spain: a number written without a country code is read as a Spanish one. */
const HOME_COUNTRY = 'ES'

/**
 * The number and its country, or undefined when nobody could call it from abroad. "+49 0151…"
 * loses the 0 that is dialled only inside Germany (an Italian "+39 06…" keeps its 0), "49 151…" is
 * read as a country code written without its "+", and "0151 12345678" (no country code, and not a
 * Spanish number) is refused: it could be from any country.
 */
export function parsePhone(phone: string): PhoneNumber | undefined {
  const tidy = cleanPhone(phone)
  if (!/^\+?[\d\s().-]+$/.test(tidy)) return undefined
  const digits = phoneDigits(tidy)
  if (/^(\+|00)/.test(tidy)) {
    const number = parsePhoneNumberFromString(`+${digits}`)
    return number?.isPossible() ? number : undefined
  }
  const home = parsePhoneNumberFromString(tidy, HOME_COUNTRY)
  if (home?.isValid()) return home
  const withoutPlus = parsePhoneNumberFromString(`+${digits}`)
  return withoutPlus?.isValid() ? withoutPlus : undefined
}

export const isPhone = (phone: string): boolean => parsePhone(phone) !== undefined

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

/**
 * A search for part of a number, however it is spaced: "600 111 222" finds "+34 600 11 12 22".
 * Only for a search that is a number (4 digits or more), so "LX-2026" doesn't look in phones.
 */
export function phoneContains(column: AnyPgColumn, search: string): SQL {
  const digits = phoneDigits(search)
  if (!/^[\d\s()+./-]+$/.test(search.trim()) || digits.length < 4) return sql`false`
  return sql`regexp_replace(coalesce(${column}, ''), '\\D', '', 'g') like ${`%${digits}%`}`
}

/** The same comparison as `samePhone`, as a database condition on a phone column. */
export function phoneMatches(column: AnyPgColumn, phone: string): SQL {
  const wanted = phoneDigits(phone)
  if (wanted.length < 7) return sql`false`
  const digits = sql`regexp_replace(regexp_replace(coalesce(${column}, ''), '\\D', '', 'g'), '^00', '')`
  if (wanted.length < 9) return sql`${digits} = ${wanted}`
  return sql`(${digits} = ${wanted} or (length(${digits}) >= 9 and right(${digits}, 9) = ${wanted.slice(-9)}))`
}
