import { parsePhoneNumberFromString } from 'libphonenumber-js'

/*
 * The same rule as `parsePhone` in the backend's lib/phone.ts, so the forms say what the API
 * would. Kept apart from lib/contact.ts, which every page loads, so only the forms that check a
 * number load the phone metadata.
 */

/**
 * Whether the API will take this as a phone number: any country with its code ("+49 151…",
 * "0049…", "49 151…"), or a Spanish number without one. "0151 12345678" is refused, since the
 * country can't be known.
 */
export function isPhone(value: string): boolean {
  const visible = value.normalize('NFKC').replace(/\p{Cf}/gu, '')
  const international = /^\s*(\+|00)/.test(visible)
  const phone = (international ? visible.replace(/\(\s*0\s*\)/, ' ') : visible)
    .replace(/[/\\‐-―−]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (phone.length > 30 || !/^\+?[\d\s().-]+$/.test(phone)) return false
  const digits = phone.replace(/\D/g, '').replace(/^00/, '')
  if (international) return parsePhoneNumberFromString(`+${digits}`)?.isPossible() ?? false
  return Boolean(parsePhoneNumberFromString(phone, 'ES')?.isValid() || parsePhoneNumberFromString(`+${digits}`)?.isValid())
}
