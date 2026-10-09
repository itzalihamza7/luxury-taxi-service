'use client'

import NextLink from 'next/link'
import { useI18n } from '@/i18n/client'
import { href, LOCALE_COOKIE, locales, switchLocalePath, type Locale } from '@/i18n/config'
import { useCurrentPath } from './CurrentPath'

/** Remember the chosen language, so the bare domain opens in it next time. */
function rememberLocale(choice: Locale): void {
  document.cookie = `${LOCALE_COOKIE}=${choice}; path=/; max-age=31536000; samesite=lax`
}

/**
 * Switches language while staying on the same page. Until the page is interactive
 * the links point at each language's home page. Made for dark surfaces.
 */
export function LanguageSwitch({ className = '' }: { className?: string }) {
  const { locale, t } = useI18n()
  const pathname = useCurrentPath()
  const target = (option: Locale) => (pathname ? switchLocalePath(pathname, option) : href(option))

  return (
    <div role="group" aria-label={t.nav.language} className={`flex items-center text-xs font-medium tracking-[0.14em] ${className}`}>
      {locales.map((option, index) => (
        <span key={option} className="flex items-center">
          {index > 0 ? <span aria-hidden className="mx-1.5 opacity-30">/</span> : null}
          <NextLink
            href={target(option)}
            hrefLang={option}
            lang={option}
            aria-current={option === locale ? 'true' : undefined}
            onClick={() => rememberLocale(option)}
            className={`uppercase transition-colors hover:text-gold-300 ${option === locale ? 'text-gold-300' : 'opacity-60'}`}
          >
            {option}
          </NextLink>
        </span>
      ))}
    </div>
  )
}
