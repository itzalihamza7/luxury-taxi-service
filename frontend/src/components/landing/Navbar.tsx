'use client'

import NextLink from 'next/link'
import { useEffect, useRef, useState, type RefObject } from 'react'
import { site } from '@/content/site'
import { href, LOCALE_COOKIE, locales, type Locale } from '@/i18n/config'
import type { LandingMessages } from '@/i18n/messages/landing'
import { phoneHref } from '@/lib/contact'
import { useEngine, useFrame } from './engine'

const SECTIONS = ['services', 'car', 'booking', 'contact'] as const

interface Props {
  t: LandingMessages['nav']
  locale: Locale
  phone: string | null
  driveRef: RefObject<HTMLElement | null>
  /** Lets the page stop smooth scrolling while the menu covers it. */
  onMenu: (open: boolean) => void
}

/** Remember the chosen language, so the bare domain opens in it next time. */
const rememberLocale = (choice: Locale) => {
  document.cookie = `${LOCALE_COOKIE}=${choice}; path=/; max-age=31536000; samesite=lax`
}

export function Navbar({ t, locale, phone, driveRef, onMenu }: Props) {
  const { scrollTo } = useEngine()
  const bar = useRef<HTMLElement>(null)
  const [open, setOpen] = useState(false)

  // Transparent over the film; solid once the film has been scrolled past.
  useFrame(() => {
    const drive = driveRef.current
    const element = bar.current
    if (!drive || !element) return
    const solid = window.scrollY > drive.offsetTop + drive.offsetHeight - element.offsetHeight
    if (solid !== (element.dataset.solid === 'true')) element.dataset.solid = String(solid)
  })

  useEffect(() => {
    onMenu(open)
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onMenu])

  const go = (target: string) => {
    // Scrolling resumes before the glide starts: resuming it afterwards would cancel the glide.
    onMenu(false)
    setOpen(false)
    scrollTo(target)
  }

  const languages = (
    <span role="group" aria-label={t.language} className="text-[12px] tracking-[0.2em]">
      {locales.map((option, index) => (
        <span key={option}>
          {index > 0 ? <span aria-hidden className="mx-1.5 opacity-50">/</span> : null}
          <NextLink
            href={href(option)}
            hrefLang={option}
            lang={option}
            aria-current={option === locale ? 'true' : undefined}
            onClick={() => rememberLocale(option)}
            className={`uppercase transition-opacity duration-300 hover:opacity-100 ${option === locale ? '' : 'opacity-50'}`}
          >
            {option}
          </NextLink>
        </span>
      ))}
    </span>
  )

  const bookNow = 'rounded-full border border-[rgba(244,238,227,0.5)] px-5 py-2 text-[13px] transition-colors duration-300 hover:bg-[var(--ivory)] hover:text-[var(--ink)]'

  return (
    <>
      <header
        ref={bar}
        data-solid="false"
        className="fixed inset-x-0 top-0 z-40 flex items-center justify-between border-b border-transparent px-6 py-5 transition-[background-color,border-color,backdrop-filter] duration-500 data-[solid=true]:border-[rgba(244,238,227,0.1)] data-[solid=true]:bg-[rgba(14,11,8,0.8)] data-[solid=true]:backdrop-blur-md sm:px-10 sm:py-6 lg:px-16"
      >
        <a
          href="#drive"
          onClick={(event) => {
            event.preventDefault()
            go('#drive')
          }}
          aria-label={site.name}
          className="l-display text-[20px] tracking-[0.3em] uppercase sm:text-[22px]"
        >
          {site.name}
        </a>

        <nav aria-label={t.label} className="hidden items-center gap-10 md:flex">
          {SECTIONS.map((id) => (
            <a
              key={id}
              href={`#${id}`}
              onClick={(event) => {
                event.preventDefault()
                go(`#${id}`)
              }}
              className="text-[12px] tracking-[0.2em] text-[var(--ivory-muted)] uppercase transition-colors duration-300 hover:text-[var(--ivory)]"
            >
              {t.links[id]}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-8 md:flex">
          {languages}
          <button type="button" onClick={() => go('#booking')} className={bookNow}>
            {t.book}
          </button>
        </div>

        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-controls="landing-menu"
          aria-label={open ? t.close : t.menu}
          className="relative z-[41] -mr-2 flex flex-col gap-[7px] p-2 md:hidden"
        >
          <span className={`h-px w-7 bg-[var(--ivory)] transition-transform duration-300 ${open ? 'translate-y-[4px] rotate-45' : ''}`} />
          <span className={`h-px w-7 bg-[var(--ivory)] transition-transform duration-300 ${open ? '-translate-y-[4px] -rotate-45' : ''}`} />
        </button>
      </header>

      <div
        id="landing-menu"
        aria-hidden={!open}
        inert={!open}
        className={`fixed inset-0 z-[39] flex flex-col justify-center gap-7 bg-[rgba(14,11,8,0.95)] px-8 backdrop-blur-md transition-opacity duration-300 md:hidden ${open ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'}`}
      >
        {SECTIONS.map((id) => (
          <a
            key={id}
            href={`#${id}`}
            onClick={(event) => {
              event.preventDefault()
              go(`#${id}`)
            }}
            className="l-display text-[40px] leading-none"
          >
            {t.links[id]}
          </a>
        ))}
        <button type="button" onClick={() => go('#booking')} className={`${bookNow} self-start`}>
          {t.book}
        </button>
        <div className="flex items-center gap-8">
          {phone ? (
            <a href={phoneHref(phone)} className="l-eyebrow text-[var(--ivory-muted)]">
              {phone}
            </a>
          ) : null}
          {languages}
        </div>
      </div>
    </>
  )
}
