import { notFound } from 'next/navigation'

/**
 * Catches every address under a language that no other page matches and shows
 * the translated "not found" page (with the normal header and footer).
 */
export default function UnknownPage() {
  notFound()
}
