'use client'

import { ArrowRight, CalendarDays, ChevronDown, Map as MapIcon, Menu, Play, X, type LucideIcon } from 'lucide-react'
import { useEffect, useState, type MouseEvent, type ReactNode } from 'react'
import { Wordmark } from '@/components/ui/Brand'
import { ButtonLink } from '@/components/ui/Button'
import { Link } from '@/components/ui/Link'
import { site } from '@/content/site'
import { useI18n } from '@/i18n/client'
import { AccountMenu, MobileAccount } from './AccountMenu'
import { useCurrentPath } from './CurrentPath'
import { LanguageSwitch } from './LanguageSwitch'

interface Props {
  /** The services as menu entries (`<li>`s), for the drop-down and for the phone menu. */
  serviceLinks: ReactNode
  mobileServiceLinks: ReactNode
  phone: ReactNode
}

type Section = 'services' | 'fleet' | 'destinations' | 'company' | 'experience'

/** The top-level entry a page belongs to, for the gold mark under it. */
function sectionOf(pathname: string | null): Section | null {
  const path = pathname?.replace(/^\/[a-z]{2}(?=\/|$)/, '') ?? ''
  if (path.startsWith('/services')) return 'services'
  if (path.startsWith('/fleet')) return 'fleet'
  if (path.startsWith('/routes') || path.startsWith('/events')) return 'destinations'
  if (/^\/(about|journal|faq|contact)(\/|$)/.test(path)) return 'company'
  if (path.startsWith('/experience')) return 'experience'
  return null
}

/** Following a link inside `event`'s target closes whatever menu holds it. */
const closesOnLink = (close: () => void) => (event: MouseEvent) => {
  if ((event.target as HTMLElement).closest('a')) close()
}

const trigger = (active: boolean) =>
  `relative inline-flex h-10 items-center gap-1 rounded-full px-3 text-[0.8125rem] font-medium tracking-wide transition-colors hover:text-gold-300 after:absolute after:inset-x-3 after:bottom-1 after:h-px after:origin-left after:bg-gold-300 after:transition-transform after:duration-300 ${
    active ? 'text-gold-300 after:scale-x-100' : 'text-bone-50/85 after:scale-x-0 hover:after:scale-x-100'
  }`

/** A menu that opens on hover, on keyboard focus and on a tap (for tablets, which have no hover). */
function Dropdown({ label, href, active, open, onToggle, children }: { label: string; href?: string; active: boolean; open: boolean; onToggle: () => void; children: ReactNode }) {
  const chevron = <ChevronDown aria-hidden className={`size-3.5 transition-transform duration-300 group-hover:rotate-180 group-focus-within:rotate-180 ${open ? 'rotate-180' : ''}`} />
  return (
    <div className="group relative">
      {href ? (
        <Link href={href} className={trigger(active)}>
          {label}
          {chevron}
        </Link>
      ) : (
        <button type="button" aria-expanded={open} onClick={onToggle} className={trigger(active)}>
          {label}
          {chevron}
        </button>
      )}
      <div
        className={`absolute left-0 top-full pt-3 transition-[opacity,translate,visibility] duration-200 ${
          open
            ? 'visible translate-y-0 opacity-100'
            : 'invisible -translate-y-1 opacity-0 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100'
        }`}
      >
        <div className="rounded-xl border border-white/10 bg-ink-900/95 p-2.5 shadow-[0_30px_60px_-20px_rgba(0,0,0,0.75)] backdrop-blur-xl">{children}</div>
      </div>
    </div>
  )
}

/** A larger entry in a drop-down: an icon, a title and a line about it. */
function PanelCard({ href, icon: Icon, title, text }: { href: string; icon: LucideIcon; title: string; text: string }) {
  return (
    <Link href={href} className="group/card flex flex-col gap-3 rounded-lg p-4 transition-colors hover:bg-white/[0.05]">
      <span className="flex size-9 items-center justify-center rounded-full border border-gold-300/30 text-gold-300 transition-colors group-hover/card:border-gold-300/70">
        <Icon aria-hidden strokeWidth={1.5} className="size-4" />
      </span>
      <span>
        <span className="flex items-center gap-1.5 text-sm font-medium text-bone-50 transition-colors group-hover/card:text-gold-300">
          {title}
          <ArrowRight aria-hidden className="size-3.5 opacity-0 transition-[opacity,translate] duration-300 group-hover/card:translate-x-0.5 group-hover/card:opacity-100" />
        </span>
        <span className="mt-1 block text-xs leading-relaxed text-bone-100/55">{text}</span>
      </span>
    </Link>
  )
}

/**
 * The three props come from the console's content and arrive a moment after
 * the header itself (see `HeaderData.tsx`). The header does not wait for them:
 * its buttons must work straight away.
 */
export function Header({ serviceLinks, mobileServiceLinks, phone }: Props) {
  const { t } = useI18n()
  const pathname = useCurrentPath()
  const section = sectionOf(pathname)
  /** Whether the page is `href` or one beneath it, for the phone menu's gold mark. */
  const here = (href: string) => {
    const path = pathname?.replace(/^\/[a-z]{2}(?=\/|$)/, '') ?? ''
    return path === href || path.startsWith(`${href}/`)
  }
  const [open, setOpen] = useState(false)
  const [menu, setMenu] = useState<Section | null>(null)
  const [scrolled, setScrolled] = useState(false)
  const [tucked, setTucked] = useState(false)
  const [focused, setFocused] = useState(false)

  // Solid once the page has moved; out of the way while the visitor reads down, back as soon as they scroll up.
  useEffect(() => {
    let last = window.scrollY
    let frame = 0
    const update = () => {
      frame = 0
      const y = window.scrollY
      setScrolled(y > 24)
      if (y < 160 || y < last - 4) setTucked(false)
      else if (y > last + 8) setTucked(true)
      last = y
    }
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(update)
    }
    frame = window.requestAnimationFrame(update)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.cancelAnimationFrame(frame)
    }
  }, [])

  // Lock page scroll while the phone menu is open; Escape closes it.
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = ''
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  // An open drop-down closes on Escape or on a click anywhere else.
  useEffect(() => {
    if (!menu) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenu(null)
    }
    const onPointer = (event: PointerEvent) => {
      if (!(event.target as HTMLElement).closest('header nav')) setMenu(null)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onPointer)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onPointer)
    }
  }, [menu])

  const toggle = (id: Section) => () => setMenu((current) => (current === id ? null : id))
  const solid = scrolled || open
  // Tucked away, the bar moves past its own height, so the glow under "Book a ride" goes with it.
  const hidden = tucked && !open && !focused && menu === null
  const compact = scrolled && !open

  const company = [
    { href: '/about', label: t.nav.about },
    { href: '/journal', label: t.nav.journal },
    { href: '/faq', label: t.nav.faq },
    { href: '/contact', label: t.nav.contact },
  ]
  const mobileLinks = [{ href: '/fleet', label: t.nav.fleet }, { href: '/routes', label: t.nav.routes }, { href: '/events', label: t.nav.events }, ...company]

  return (
    <header
      onFocus={() => setFocused(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocused(false)
      }}
      className={`no-print fixed inset-x-0 top-0 z-50 text-bone-50 transition-[translate,background-color,border-color,box-shadow] duration-500 ease-out-expo ${
        solid ? 'border-b border-gold-300/15 bg-ink-950/85 shadow-[0_12px_40px_-24px_rgba(0,0,0,0.8)] backdrop-blur-xl' : 'border-b border-transparent'
      } ${hidden ? '-translate-y-[calc(100%+2.5rem)]' : 'translate-y-0'}`}
    >
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-10 focus:rounded-full focus:bg-gold-400 focus:px-4 focus:py-2 focus:text-sm focus:text-ink-950">
        {t.nav.skip}
      </a>

      <div className={`container-page flex items-center justify-between gap-4 transition-[height] duration-500 ease-out-expo ${compact ? 'h-16' : 'h-[4.5rem]'}`}>
        <Link href="/" aria-label={site.name} className="shrink-0">
          <Wordmark />
        </Link>

        <nav aria-label={t.nav.main} className="hidden items-center gap-1 lg:flex xl:gap-2" onClick={closesOnLink(() => setMenu(null))}>
          <Dropdown label={t.nav.services} href="/services" active={section === 'services'} open={menu === 'services'} onToggle={toggle('services')}>
            <div className="grid w-[40rem] grid-cols-[minmax(0,1fr)_13rem] gap-2">
              <ul className="grid content-start gap-0.5">{serviceLinks}</ul>
              <div className="flex flex-col rounded-lg border border-gold-300/20 bg-gold-400/[0.07] p-5">
                <p className="eyebrow text-gold-300">{t.cta.eyebrow}</p>
                <p className="display mt-3 text-[1.625rem] leading-tight text-bone-50">{t.actions.getPrice}</p>
                <p className="mt-2 text-xs leading-relaxed text-bone-100/60">{t.nav.quoteHint}</p>
                <ButtonLink href="/booking" arrow className="mt-6 self-start">
                  {t.actions.book}
                </ButtonLink>
                <Link href="/services" className="mt-auto inline-flex items-center gap-1.5 pt-5 text-xs font-medium text-bone-50/70 transition-colors hover:text-gold-300">
                  {t.nav.allServices}
                  <ArrowRight aria-hidden className="size-3" />
                </Link>
              </div>
            </div>
          </Dropdown>

          <Link href="/fleet" className={trigger(section === 'fleet')}>
            {t.nav.fleet}
          </Link>

          <Dropdown label={t.nav.destinations} active={section === 'destinations'} open={menu === 'destinations'} onToggle={toggle('destinations')}>
            <div className="grid w-[30rem] grid-cols-2 gap-1">
              <PanelCard href="/routes" icon={MapIcon} title={t.nav.routes} text={t.nav.routesHint} />
              <PanelCard href="/events" icon={CalendarDays} title={t.nav.events} text={t.nav.eventsHint} />
            </div>
          </Dropdown>

          <Dropdown label={t.footer.company} active={section === 'company'} open={menu === 'company'} onToggle={toggle('company')}>
            <ul className="w-52">
              {company.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="group/link flex items-center justify-between rounded-md px-3 py-2.5 text-sm text-bone-50/85 transition-colors hover:bg-white/[0.05] hover:text-gold-300">
                    {link.label}
                    <ArrowRight aria-hidden className="size-3.5 opacity-0 transition-opacity group-hover/link:opacity-100" />
                  </Link>
                </li>
              ))}
            </ul>
          </Dropdown>
        </nav>

        <div className="flex items-center gap-2.5 xl:gap-3.5">
          {/* The width is reserved, so the menu does not move when the number arrives. */}
          <div className="hidden min-w-[9.75rem] justify-end 2xl:flex">{phone}</div>
          {/* Wrappers own the show/hide rule, so it never competes with a component's own display class. */}
          <div className="hidden sm:block">
            <LanguageSwitch />
          </div>
          <div className="hidden sm:block">
            <AccountMenu />
          </div>
          {/* The film, beside the booking button: a play button between 1024 and 1279 px, labelled from 1280. */}
          <Link
            href="/experience"
            aria-label={t.nav.experience}
            title={t.nav.experienceHint}
            className={`group hidden items-center gap-2.5 rounded-full border py-1 pl-1 pr-1 text-[0.8125rem] font-medium tracking-wide text-gold-200 transition-colors lg:inline-flex xl:pr-4 ${
              section === 'experience' ? 'border-gold-300 bg-gold-300/10' : 'border-gold-300/45 hover:border-gold-300 hover:bg-gold-300/10'
            }`}
          >
            <span className="flex size-8 items-center justify-center rounded-full bg-gold-400 text-ink-950 transition-transform duration-300 ease-out-expo group-hover:scale-105">
              <Play aria-hidden className="ml-px size-3.5 fill-current" />
            </span>
            <span className="hidden xl:inline">{t.nav.experience}</span>
          </Link>
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

      {/* Phone menu */}
      <div id="mobile-menu" hidden={!open} className="h-[calc(100dvh-4.5rem)] overflow-y-auto border-t border-white/10 bg-ink-950 lg:hidden">
        <nav aria-label={t.nav.main} className="container-page flex flex-col gap-8 pb-12 pt-6" onClick={closesOnLink(() => setOpen(false))}>
          <Link href="/experience" className="group flex items-center gap-4 rounded-xl border border-gold-300/25 bg-gold-400/[0.06] p-4 transition-colors hover:border-gold-300/60">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-gold-400 text-ink-950">
              <Play aria-hidden className="ml-0.5 size-5 fill-current" />
            </span>
            <span className="min-w-0">
              <span className="display block text-2xl leading-tight text-bone-50">{t.actions.watchExperience}</span>
              <span className="mt-0.5 block text-xs text-bone-100/60">{t.nav.experienceHint}</span>
            </span>
            <ArrowRight aria-hidden className="ml-auto size-5 shrink-0 text-gold-300 transition-transform duration-300 group-hover:translate-x-1" />
          </Link>

          <ul className="border-t border-white/10">
            <li className="border-b border-white/10">
              <details className="group/services">
                <summary className={`display flex cursor-pointer list-none items-center justify-between py-4 text-[1.75rem] [&::-webkit-details-marker]:hidden ${section === 'services' ? 'text-gold-300' : ''}`}>
                  {t.nav.services}
                  <ChevronDown aria-hidden className="size-5 text-gold-300 transition-transform duration-300 group-open/services:rotate-180" />
                </summary>
                <ul className="pb-4">
                  {mobileServiceLinks}
                  <li>
                    <Link href="/services" className="mt-1 inline-flex items-center gap-2 py-2 pl-1 text-sm font-medium text-gold-300">
                      {t.nav.allServices}
                      <ArrowRight aria-hidden className="size-3.5" />
                    </Link>
                  </li>
                </ul>
              </details>
            </li>
            {mobileLinks.map((link) => (
              <li key={link.href} className="border-b border-white/10">
                <Link href={link.href} className={`display block py-4 text-[1.75rem] transition-colors hover:text-gold-300 ${here(link.href) ? 'text-gold-300' : ''}`}>
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>

          <div className="flex flex-col gap-4">
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
