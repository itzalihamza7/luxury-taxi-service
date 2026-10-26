'use client'

import { MessageCircle, MessagesSquare, Phone } from 'lucide-react'
import { Link } from '@/components/ui/Link'
import { useI18n } from '@/i18n/client'
import { phoneHref, whatsappHref } from '@/lib/contact'
import { useCurrentPath } from './CurrentPath'
import { openChat, useChatReady } from './WebsiteChat'

/**
 * Thumb-reach actions on phones: call, WhatsApp, the website chat (once it has loaded), book. It
 * is hidden on form pages, where it would cover the form's own buttons, so it waits until the
 * address is known.
 */
export function MobileBar({ phone, whatsapp }: { phone: string | null; whatsapp: string | null }) {
  const { t } = useI18n()
  const pathname = useCurrentPath()
  const chat = useChatReady()
  if (pathname === null || /\/(booking|login|register|account|forgot-password|reset-password)(\/|$)/.test(pathname)) return null

  const item = 'flex flex-1 flex-col items-center justify-center gap-1 text-[0.6875rem] font-medium tracking-wide text-bone-100/80'
  return (
    <div className="no-print fixed inset-x-0 bottom-0 z-40 flex h-16 items-stretch border-t border-white/10 bg-ink-950/95 backdrop-blur-md lg:hidden">
      {phone ? (
        <a href={phoneHref(phone)} className={item}>
          <Phone aria-hidden className="size-[1.125rem] text-gold-300" />
          {t.actions.call}
        </a>
      ) : null}
      {whatsapp ? (
        <a href={whatsappHref(whatsapp)} target="_blank" rel="noopener noreferrer" className={`${item} border-x border-white/10`}>
          <MessageCircle aria-hidden className="size-[1.125rem] text-gold-300" />
          WhatsApp
        </a>
      ) : null}
      {chat ? (
        <button type="button" onClick={openChat} className={`${item} border-r border-white/10`}>
          <MessagesSquare aria-hidden className="size-[1.125rem] text-gold-300" />
          {t.actions.chat}
        </button>
      ) : null}
      <Link href="/booking" className="flex flex-[1.4] items-center justify-center bg-gold-400 text-sm font-semibold text-ink-950">
        {t.actions.book}
      </Link>
    </div>
  )
}
