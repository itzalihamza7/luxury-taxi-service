'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useRef } from 'react'
import { useAnalyticsConsent } from './CookieConsent'

/**
 * Microsoft Clarity (clicks, scrolling and session recordings), loaded only for visitors who
 * allowed analytics in the cookie banner. Pages that show a visitor's own details (their
 * account, a booking, payment) are never recorded.
 */

const CLARITY_ID = 'zdhzb11dn4'
const PRIVATE_PAGES = /^\/[a-z]{2}\/(?:(?:account|login|register|forgot-password|reset-password)(?:\/|$)|booking\/.)/

type ClarityCommand = (...args: unknown[]) => void

declare global {
  interface Window {
    clarity?: ClarityCommand & { q?: unknown[][] }
  }
}

/** Microsoft's tag, as in their snippet: commands queue up until the script has loaded. */
function loadClarity() {
  const clarity: ClarityCommand & { q?: unknown[][] } = (...args) => {
    ;(clarity.q ??= []).push(args)
  }
  window.clarity = clarity
  const script = document.createElement('script')
  script.async = true
  script.src = `https://www.clarity.ms/tag/${CLARITY_ID}`
  document.head.appendChild(script)
}

export function Clarity() {
  const allowed = useAnalyticsConsent()
  const pathname = usePathname()
  const recording = allowed && !PRIVATE_PAGES.test(pathname)
  const paused = useRef(false)

  useEffect(() => {
    if (recording) {
      if (!window.clarity) loadClarity()
      window.clarity?.('consentv2', { ad_Storage: 'denied', analytics_Storage: 'granted' })
      if (paused.current) window.clarity?.('start')
      paused.current = false
    } else if (window.clarity && !paused.current) {
      window.clarity('stop')
      paused.current = true
    }
  }, [recording])

  // A visitor who withdraws consent: Clarity removes its cookies. It is not loaded again on the next page.
  useEffect(() => {
    if (!allowed) window.clarity?.('consentv2', { ad_Storage: 'denied', analytics_Storage: 'denied' })
  }, [allowed])

  return null
}
