'use client'

import { ChevronDown, Menu, X } from 'lucide-react'
import { useEffect, useState, useSyncExternalStore, type ReactNode } from 'react'
import { Wordmark } from '@/components/ui/Brand'
import { ButtonLink } from '@/components/ui/Button'
import { Link } from '@/components/ui/Link'
import { site } from '@/content/site'
import { useI18n } from '@/i18n/client'
import { AccountMenu, MobileAccount } from './AccountMenu'
import { LanguageSwitch } from './LanguageSwitch'

function subscribeToScroll(onChange: () => void) {
  window.addEventListener('scroll', onChange, { passive: true })
  return () => window.removeEventListener('scroll', onChange)
}

interface Props {
  /** The services as menu entries (`<li>`s), for the drop-down and for the phone menu. */
  serviceLinks: ReactNode
  mobileServiceLinks: ReactNode
  phone: ReactNode
}

/**
 * The three props come from the console's content and arrive a moment after
 * the header itself (see `HeaderData.tsx`). The header does not wait for them:
 * its buttons must work straight away.
 */
export function Header({ serviceLinks, mobileServiceLinks, phone }: Props) {
  const { t } = useI18n()
  // The bar turns solid once the page has scrolled past the top of the hero.
  const scrolled = useSyncExternalStore(
    subscribeToScroll,
    () => window.scrollY > 24,
    () => false,
  )
  const [open, setOpen] = useState(false)

  // Lock page scroll while the mobile menu is open.
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  const links = [
    { href: '/fleet', label: t.nav.fleet },
    { href: '/routes', label: t.nav.routes },
    { href: '/events', label: t.nav.events },
    { href: '/journal', label: t.nav.journal },
    { href: '/about', label: t.nav.about },
    { href: '/contact', label: t.nav.contact },
  ]
  const linkClass = 'inline-flex h-10 items-center text-[0.8125rem] font-medium tracking-wide text-bone-50/80 transition-colors hover:text-gold-300'

  return (
    <header
      className={`no-print fixed inset-x-0 top-0 z-50 text-bone-50 transition-[background-color,border-color] duration-500 ${
        scrolled || open ? 'border-b border-white/10 bg-ink-950/90 backdrop-blur-md' : 'border-b border-transparent'
      }`}
    >
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-10 focus:rounded-full focus:bg-gold-400 focus:px-4 focus:py-2 focus:text-sm focus:text-ink-950">
        {t.nav.skip}
      </a>

      <div className="container-page flex h-[4.5rem] items-center justify-between gap-6">
        <Link href="/" aria-label={`${site.name} ${site.descriptor}`} className="shrink-0">
          <Wordmark />
        </Link>

        <nav aria-label={t.nav.main} className="hidden items-center gap-7 lg:flex">
          <div className="group relative">
            <Link href="/services" className={`${linkClass} gap-1`}>
              {t.nav.services}
              <ChevronDown aria-hidden className="size-3.5 transition-transform duration-300 group-hover:rotate-180 group-focus-within:rotate-180" />
            </Link>
            <div className="invisible absolute left-1/2 top-full w-72 -translate-x-1/2 pt-4 opacity-0 transition-all duration-200 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
              <ul className="rounded-md border border-white/10 bg-ink-900/95 p-2 shadow-2xl backdrop-blur-md empty:hidden">{serviceLinks}</ul>
            </div>
          </div>
          {links.map((link) => (
            <Link key={link.href} href={link.href} className={linkClass}>
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          {/* The width is reserved, so the menu does not move when the number arrives. */}
          <div className="hidden min-w-[9.75rem] justify-end xl:flex">{phone}</div>
          {/* Wrappers own the show/hide rule, so it never competes with a component's own display class. */}
          <div className="hidden sm:block">
            <LanguageSwitch />
          </div>
          <div className="hidden sm:block">
            <AccountMenu />
          </div>
          <div className="hidden sm:block">
            <ButtonLink href="/booking">{t.actions.book}</ButtonLink>
          </div>
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? t.nav.close : t.nav.menu}
            className="-mr-2 rounded-full p-2 lg:hidden"
          >
            {open ? <X aria-hidden className="size-6" /> : <Menu aria-hidden className="size-6" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <div
        id="mobile-menu"
        hidden={!open}
        className="h-[calc(100dvh-4.5rem)] overflow-y-auto border-t border-white/10 bg-ink-950 lg:hidden"
      >
        {/* Following any link in the menu closes it. */}
        <nav
          aria-label={t.nav.main}
          className="container-page flex flex-col py-8"
          onClick={(event) => {
            if ((event.target as HTMLElement).closest('a')) setOpen(false)
          }}
        >
          <Link href="/services" className="display border-b border-white/10 py-4 text-3xl">
            {t.nav.services}
          </Link>
          <ul className="border-b border-white/10 py-3 empty:hidden">{mobileServiceLinks}</ul>
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="display border-b border-white/10 py-4 text-3xl">
              {link.label}
            </Link>
          ))}
          <div className="mt-8 flex flex-col gap-4">
            <ButtonLink href="/booking" size="lg" arrow>
              {t.actions.book}
            </ButtonLink>
            <MobileAccount onDone={() => setOpen(false)} />
            <div className="flex items-center justify-between pt-2 text-sm text-bone-50/70">
              <Link href="/booking/track">{t.nav.track}</Link>
              <LanguageSwitch />
            </div>
          </div>
        </nav>
      </div>
    </header>
  )
}
