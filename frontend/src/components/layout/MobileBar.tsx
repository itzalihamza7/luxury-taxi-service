'use client'

import { MessageCircle, Phone } from 'lucide-react'
import { Link } from '@/components/ui/Link'
import { phoneHref, whatsappHref } from '@/content/site'
import { useI18n } from '@/i18n/client'
import { useCurrentPath } from './CurrentPath'

/**
 * Thumb-reach actions on phones: call, WhatsApp, book. It is hidden on form pages,
 * where it would cover the form's own buttons, so it waits until the address is known.
 */
export function MobileBar() {
  const { t } = useI18n()
  const pathname = useCurrentPath()
  if (pathname === null || /\/(booking|login|register|account|admin)(\/|$)/.test(pathname)) return null

  const item = 'flex flex-1 flex-col items-center justify-center gap-1 text-[0.6875rem] font-medium tracking-wide text-bone-100/80'
  return (
    <div className="no-print fixed inset-x-0 bottom-0 z-40 flex h-16 items-stretch border-t border-white/10 bg-ink-950/95 backdrop-blur-md lg:hidden">
      <a href={phoneHref} className={item}>
        <Phone aria-hidden className="size-[1.125rem] text-gold-300" />
        {t.actions.call}
      </a>
      <a href={whatsappHref()} target="_blank" rel="noopener noreferrer" className={`${item} border-x border-white/10`}>
        <MessageCircle aria-hidden className="size-[1.125rem] text-gold-300" />
        WhatsApp
      </a>
      <Link href="/booking" className="flex flex-[1.4] items-center justify-center bg-gold-400 text-sm font-semibold text-ink-950">
        {t.actions.book}
      </Link>
    </div>
  )
}
