import { NextResponse, type NextRequest } from 'next/server'
import { defaultLocale, isLocale, LOCALE_COOKIE, type Locale } from './i18n/config'

/** Pick the visitor's language: an earlier explicit choice first, then the browser's preference. */
function preferredLocale(request: NextRequest): Locale {
  const remembered = request.cookies.get(LOCALE_COOKIE)?.value
  if (isLocale(remembered)) return remembered

  const header = request.headers.get('accept-language') ?? ''
  const ranked = header
    .split(',')
    .map((part) => {
      const [tag = '', quality] = part.trim().split(';q=')
      return { language: tag.split('-')[0]?.toLowerCase(), weight: quality ? Number(quality) : 1 }
    })
    .filter((entry) => !Number.isNaN(entry.weight))
    .sort((a, b) => b.weight - a.weight)

  for (const { language } of ranked) {
    if (isLocale(language)) return language
  }
  return defaultLocale
}

/**
 * Every page lives under a language prefix (`/en/...`, `/es/...`).
 * Requests without one are redirected to the visitor's language.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  if (isLocale(pathname.split('/')[1])) return NextResponse.next()

  const url = request.nextUrl.clone()
  url.pathname = `/${preferredLocale(request)}${pathname === '/' ? '' : pathname}`
  return NextResponse.redirect(url)
}

export const config = {
  // Skip the API, Next.js internals and anything with a file extension (icons, sitemap.xml, robots.txt...).
  matcher: ['/((?!api|_next|.*\\..*).*)'],
}
