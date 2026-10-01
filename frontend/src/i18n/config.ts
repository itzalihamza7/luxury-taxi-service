export const locales = ['en', 'es'] as const
export type Locale = (typeof locales)[number]

export const defaultLocale: Locale = 'en'

/** Name of the cookie that remembers the visitor's language choice. */
export const LOCALE_COOKIE = 'locale'

export const localeNames: Record<Locale, string> = { en: 'English', es: 'Español' }

/** BCP 47 tags used for dates, numbers and `hreflang`. */
export const localeTags: Record<Locale, string> = { en: 'en-GB', es: 'es-ES' }

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (locales as readonly string[]).includes(value)
}

/** Text that exists in every supported language. */
export type Localized<T = string> = Record<Locale, T>

/** Prefix an internal path with the locale: `href('es', '/fleet')` -> `/es/fleet`. */
export function href(locale: Locale, path = '/'): string {
  const clean = path.startsWith('/') ? path : `/${path}`
  return clean === '/' ? `/${locale}` : `/${locale}${clean}`
}

/** The same page in another language: swaps the leading locale segment. */
export function switchLocalePath(pathname: string, target: Locale): string {
  const segments = pathname.split('/')
  if (isLocale(segments[1])) segments[1] = target
  else segments.splice(1, 0, target)
  return segments.join('/') || `/${target}`
}

/** Replace `{name}` placeholders in a translated string. */
export function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => (key in values ? String(values[key]) : match))
}
