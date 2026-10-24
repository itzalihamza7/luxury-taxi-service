'use client'

import { useEffect } from 'react'

/** Where the visitor came from, when it was another site. */
function externalReferrer(): string | null {
  try {
    const from = document.referrer ? new URL(document.referrer).host : ''
    return from && from !== window.location.host ? from : null
  } catch {
    return null
  }
}

/** Report one WhatsApp click, e.g. from a form that opens WhatsApp itself rather than through a link. */
export function reportWhatsAppClick() {
  const body = JSON.stringify({ page: window.location.pathname, referrer: externalReferrer(), touch: navigator.maxTouchPoints > 1 })
  // A beacon still goes out while the browser leaves for WhatsApp.
  const sent = navigator.sendBeacon?.('/api/track/whatsapp', new Blob([body], { type: 'application/json' }))
  if (!sent) void fetch('/api/track/whatsapp', { method: 'POST', body, keepalive: true, headers: { 'Content-Type': 'application/json' } }).catch(() => undefined)
}

/**
 * Tells the admin panel when someone opens WhatsApp from the site. Listens on
 * the whole page, so every WhatsApp link counts, wherever it is. Renders nothing.
 */
export function WhatsAppTracker() {
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.button > 1) return
      const link = (event.target as Element | null)?.closest?.('a[href^="https://wa.me/"]')
      if (link) reportWhatsAppClick()
    }
    document.addEventListener('click', onClick, true)
    document.addEventListener('auxclick', onClick, true)
    return () => {
      document.removeEventListener('click', onClick, true)
      document.removeEventListener('auxclick', onClick, true)
    }
  }, [])
  return null
}
