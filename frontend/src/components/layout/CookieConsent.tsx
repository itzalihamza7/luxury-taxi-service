'use client'

import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { Button } from '@/components/ui/Button'
import { Link } from '@/components/ui/Link'
import { useI18n } from '@/i18n/client'

/**
 * Cookie consent.
 *
 * The site itself only sets necessary cookies. The "analytics" choice is stored
 * so that an analytics script, if one is added later, can be loaded only for
 * visitors who allowed it: check `readConsent()?.analytics` before loading it.
 */

const STORAGE_KEY = 'cookie-consent'
const OPEN_EVENT = 'cookie-settings:open'
const CHANGE_EVENT = 'cookie-settings:change'

export interface Consent {
  analytics: boolean
}

/** The stored choice as saved, or null when the visitor has not chosen yet (or storage is blocked). */
function rawConsent(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

export function readConsent(): Consent | null {
  try {
    const raw = rawConsent()
    return raw ? (JSON.parse(raw) as Consent) : null
  } catch {
    return null
  }
}

function writeConsent(consent: Consent): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(consent))
  } catch {
    // Private browsing: the choice simply lasts for this visit.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT))
}

function subscribe(onChange: () => void) {
  window.addEventListener(CHANGE_EVENT, onChange)
  window.addEventListener('storage', onChange)
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange)
    window.removeEventListener('storage', onChange)
  }
}

/** Footer link that reopens the settings dialog. */
export function CookieSettingsButton() {
  const { t } = useI18n()
  return (
    <button type="button" onClick={() => window.dispatchEvent(new Event(OPEN_EVENT))} className="transition-colors hover:text-gold-300">
      {t.footer.cookieSettings}
    </button>
  )
}

export function CookieConsent() {
  const { t } = useI18n()
  const dialog = useRef<HTMLDialogElement>(null)
  // `undefined` while rendering on the server, so the banner never flashes before the stored choice is known.
  const stored = useSyncExternalStore(subscribe, rawConsent, () => undefined)
  const [analytics, setAnalytics] = useState(false)

  useEffect(() => {
    const open = () => {
      setAnalytics(readConsent()?.analytics ?? false)
      dialog.current?.showModal()
    }
    window.addEventListener(OPEN_EVENT, open)
    return () => window.removeEventListener(OPEN_EVENT, open)
  }, [])

  const decide = (consent: Consent) => {
    writeConsent(consent)
    dialog.current?.close()
  }

  return (
    <>
      {stored === null ? (
        <div role="region" aria-label={t.cookies.title} className="no-print fixed inset-x-3 bottom-20 z-40 mx-auto max-w-3xl rounded-lg border border-white/10 bg-ink-900/95 p-5 text-bone-100 shadow-2xl backdrop-blur-md sm:p-6 lg:bottom-6">
          <p className="text-sm leading-relaxed text-bone-100/75">
            {t.cookies.text}{' '}
            <Link href="/legal/cookies" className="underline decoration-gold-300/50 underline-offset-4 hover:text-gold-300">
              {t.cookies.policy}
            </Link>
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button onClick={() => decide({ analytics: true })}>{t.cookies.acceptAll}</Button>
            <Button variant="outline-light" onClick={() => decide({ analytics: false })}>
              {t.cookies.necessaryOnly}
            </Button>
            <button type="button" onClick={() => window.dispatchEvent(new Event(OPEN_EVENT))} className="px-2 text-sm text-bone-100/70 underline-offset-4 hover:text-gold-300 hover:underline">
              {t.cookies.settings}
            </button>
          </div>
        </div>
      ) : null}

      <dialog
        ref={dialog}
        aria-labelledby="cookie-settings-title"
        className="m-auto w-[min(32rem,calc(100vw-2rem))] rounded-lg bg-bone-50 p-0 text-ink-900 shadow-2xl backdrop:bg-ink-950/70 backdrop:backdrop-blur-sm"
      >
        <div className="p-7">
          <h2 id="cookie-settings-title" className="display text-3xl">
            {t.cookies.settingsTitle}
          </h2>
          <ul className="mt-6 divide-y divide-ink-900/10 border-y border-ink-900/10">
            <li className="flex items-start justify-between gap-6 py-4">
              <div>
                <p className="font-medium">{t.cookies.necessary}</p>
                <p className="mt-1 text-sm text-ink-900/60">{t.cookies.necessaryText}</p>
              </div>
              <input type="checkbox" checked disabled aria-label={t.cookies.necessary} className="mt-1 size-5 accent-gold-600" />
            </li>
            <li className="flex items-start justify-between gap-6 py-4">
              <label htmlFor="cookie-analytics">
                <span className="font-medium">{t.cookies.analytics}</span>
                <span className="mt-1 block text-sm text-ink-900/60">{t.cookies.analyticsText}</span>
              </label>
              <input
                id="cookie-analytics"
                type="checkbox"
                checked={analytics}
                onChange={(event) => setAnalytics(event.target.checked)}
                className="mt-1 size-5 accent-gold-600"
              />
            </li>
          </ul>
          <div className="mt-6 flex flex-wrap justify-end gap-3">
            <Button variant="outline" onClick={() => dialog.current?.close()}>
              {t.actions.cancel}
            </Button>
            <Button variant="dark" onClick={() => decide({ analytics })}>
              {t.cookies.save}
            </Button>
          </div>
        </div>
      </dialog>
    </>
  )
}
