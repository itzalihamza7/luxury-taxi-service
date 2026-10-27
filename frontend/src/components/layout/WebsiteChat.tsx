'use client'

import Script from 'next/script'
import { useEffect, useSyncExternalStore } from 'react'
import { CHAT_ORIGIN, CHAT_WIDGET } from '@/lib/website-chat'

/*
 * The chat's script adds one box to the end of <body>: its button and its panel, inside a shadow
 * root. On large screens that button is the way in; on phones and tablets it would cover the
 * bar of buttons at the bottom, so it is hidden there (globals.css) and the bar gets a Chat button.
 */

/** The chat's box, once its script has drawn it: the child of <body> whose shadow root has the button. */
function findChat(): HTMLElement | null {
  for (const element of document.body.children) {
    if (element instanceof HTMLElement && element.shadowRoot?.querySelector('.launcher')) return element
  }
  return null
}

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange)
  observer.observe(document.body, { childList: true })
  return () => observer.disconnect()
}

/** Whether the chat is on the page: it loads last, and only on the business's own sites. */
export function useChatReady(): boolean {
  return useSyncExternalStore(subscribe, () => findChat() !== null, () => false)
}

/** Opens the chat, as its own button would. */
export function openChat() {
  findChat()?.shadowRoot?.querySelector<HTMLButtonElement>('.launcher')?.click()
}

/**
 * Loads the chat as soon as the page works, and marks its box for the page's styles. The script is
 * small; waiting for an idle moment instead could mean waiting for ever while the 3D showroom draws.
 */
export function WebsiteChat() {
  useEffect(() => {
    const mark = () => {
      const chat = findChat()
      if (!chat) return
      chat.setAttribute('data-website-chat', '')
      chat.hidden = false
    }
    const observer = new MutationObserver(mark)
    observer.observe(document.body, { childList: true })
    mark()
    return () => {
      observer.disconnect()
      // The box stays in <body> when the visitor moves on within the app (to the console, say): hide it there.
      const chat = findChat()
      if (chat) chat.hidden = true
    }
  }, [])
  return <Script src={`${CHAT_ORIGIN}/widget.js`} data-agent={CHAT_WIDGET} strategy="afterInteractive" />
}
