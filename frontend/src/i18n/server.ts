import { notFound } from 'next/navigation'
import { locale as rootLocale } from 'next/root-params'
import { isLocale, type Locale } from './config'
import { account } from './messages/account'
import { booking } from './messages/booking'
import { common } from './messages/common'
import { landing } from './messages/landing'
import { manage } from './messages/manage'
import { pages } from './messages/pages'

/**
 * The language of the current request, taken from the `[locale]` route segment.
 * Usable in any Server Component - no need to pass it down as a prop.
 */
export async function getLocale(): Promise<Locale> {
  const value = await rootLocale()
  if (!isLocale(value)) notFound()
  return value
}

/** Shared strings (navigation, actions, statuses, errors) for the current language. */
export async function getCommon() {
  return common[await getLocale()]
}

/** Copy for the home page. */
export async function getLanding() {
  return landing[await getLocale()]
}

/** Copy for the marketing pages. */
export async function getPages() {
  return pages[await getLocale()]
}

/** Copy for the booking flow. Passed to its client components as props. */
export async function getBooking() {
  return booking[await getLocale()]
}

/** Copy for sign-in, the customer account and the operations console. */
export async function getAccount() {
  return account[await getLocale()]
}

/** Copy for managing the fleet, the content and the business details in the console. */
export async function getManage() {
  return manage[await getLocale()]
}
