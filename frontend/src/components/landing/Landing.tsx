'use client'

import Lenis from 'lenis'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { site } from '@/content/site'
import type { Locale } from '@/i18n/config'
import type { LandingMessages } from '@/i18n/messages/landing'
import { Drive } from './Drive'
import { EngineContext, type FrameCallback, prefersReducedMotion, useReducedMotion } from './engine'
import { Navbar } from './Navbar'
import { Booking, Footer, Services, TheCar } from './Sections'

const VIDEO = { desktop: '/video/maybach-hero.mp4', mobile: '/video/maybach-hero-mobile.mp4' }
const MOBILE = '(max-width: 767px)'

export interface LandingContact {
  phone: string | null
  whatsapp: string | null
  email: string | null
  instagram: string | null
}

interface Props {
  t: LandingMessages
  locale: Locale
  contact: LandingContact
  year: number
}

/**
 * Downloads the film with progress, so the whole file is in memory and every
 * seek is instant. Falls back to streaming it from its address.
 */
async function loadVideo(src: string, onProgress: (fraction: number) => void, signal: AbortSignal): Promise<string> {
  try {
    const response = await fetch(src, { signal })
    if (!response.ok || !response.body) throw new Error(`HTTP ${response.status}`)
    const total = Number(response.headers.get('content-length')) || 0
    const reader = response.body.getReader()
    const chunks: Uint8Array<ArrayBuffer>[] = []
    let received = 0
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      chunks.push(value)
      received += value.byteLength
      if (total) onProgress(Math.min(1, received / total))
    }
    onProgress(1)
    return URL.createObjectURL(new Blob(chunks, { type: response.headers.get('content-type') ?? 'video/mp4' }))
  } catch (error) {
    if (signal.aborted) throw error
    return src
  }
}

/** The home page: the film driven by the scroll, then services, the car, booking and contact. */
export function Landing({ t, locale, contact, year }: Props) {
  const reduced = useReducedMotion()
  const frames = useRef(new Set<FrameCallback>())
  const lenis = useRef<Lenis | null>(null)
  const drive = useRef<HTMLElement>(null)
  const video = useRef<HTMLVideoElement>(null)
  const mobile = useRef(false)
  const fill = useRef<HTMLSpanElement>(null)
  const percent = useRef<HTMLSpanElement>(null)
  const [loader, setLoader] = useState<'loading' | 'leaving' | 'gone'>('loading')
  const loaded = useRef(false)

  const onFrame = useCallback((callback: FrameCallback) => {
    frames.current.add(callback)
    return () => {
      frames.current.delete(callback)
    }
  }, [])

  const scrollTo = useCallback((target: string | number | HTMLElement) => {
    if (lenis.current) {
      lenis.current.scrollTo(target, { duration: 1.6 })
      return
    }
    if (typeof target === 'number') window.scrollTo({ top: target })
    else (typeof target === 'string' ? document.querySelector(target) : target)?.scrollIntoView()
  }, [])

  const engine = useMemo(() => ({ onFrame, scrollTo }), [onFrame, scrollTo])

  // Smooth scrolling (not for visitors who prefer less motion), and the one frame loop.
  useEffect(() => {
    mobile.current = window.matchMedia(MOBILE).matches
    const query = window.matchMedia(MOBILE)
    const onChange = () => (mobile.current = query.matches)
    query.addEventListener('change', onChange)

    const smooth = reduced || prefersReducedMotion() ? null : new Lenis({ lerp: 0.08, smoothWheel: true, autoRaf: false })
    lenis.current = smooth
    // Held still until the film is ready.
    if (smooth && !loaded.current) smooth.stop()

    let id = 0
    const loop = (time: number) => {
      smooth?.raf(time)
      for (const callback of frames.current) callback()
      id = window.requestAnimationFrame(loop)
    }
    id = window.requestAnimationFrame(loop)
    return () => {
      window.cancelAnimationFrame(id)
      query.removeEventListener('change', onChange)
      smooth?.destroy()
      lenis.current = null
    }
  }, [reduced])

  // The film: picked once for the screen size, downloaded with progress, then shown.
  useEffect(() => {
    // Without motion there is no film to wait for (the loader is not shown, see below).
    if (reduced || prefersReducedMotion()) {
      loaded.current = true
      return
    }
    const element = video.current
    if (!element) return
    const controller = new AbortController()
    let objectUrl: string | null = null
    let hide: number | undefined

    const reveal = () => {
      if (loaded.current) return
      loaded.current = true
      setLoader('leaving')
      hide = window.setTimeout(() => {
        setLoader('gone')
        lenis.current?.start()
      }, 700)
    }
    const onReady = () => {
      // iOS shows nothing for a video that has never played: play and pause once.
      element
        .play()
        .then(() => element.pause())
        .catch(() => undefined)
        .finally(() => {
          element.currentTime = 0
          reveal()
        })
    }
    element.addEventListener('loadeddata', onReady, { once: true })
    // A film that cannot be played must not keep the page behind the loader.
    element.addEventListener('error', reveal, { once: true })

    const src = window.matchMedia(MOBILE).matches ? VIDEO.mobile : VIDEO.desktop
    loadVideo(
      src,
      (fraction) => {
        if (fill.current) fill.current.style.width = `${fraction * 100}%`
        if (percent.current) percent.current.textContent = `${Math.round(fraction * 100)}%`
      },
      controller.signal,
    )
      .then((url) => {
        if (url.startsWith('blob:')) objectUrl = url
        element.src = url
        element.load()
      })
      .catch(() => undefined)

    return () => {
      controller.abort()
      window.clearTimeout(hide)
      element.removeEventListener('loadeddata', onReady)
      element.removeEventListener('error', reveal)
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [reduced])

  const onMenu = useCallback((open: boolean) => {
    if (!loaded.current) return
    if (open) lenis.current?.stop()
    else lenis.current?.start()
  }, [])

  return (
    <EngineContext value={engine}>
      <div className="landing" data-motion={reduced ? undefined : 'true'}>
        <Navbar t={t.nav} locale={locale} phone={contact.phone} driveRef={drive} onMenu={onMenu} />
        <main>
          <Drive t={t.drive} whatsapp={contact.whatsapp} sectionRef={drive} videoRef={video} mobileRef={mobile} still={reduced} />
          <Services t={t.services} still={reduced} />
          <TheCar t={t.car} still={reduced} />
          <Booking t={t.booking} contact={contact} locale={locale} />
        </main>
        <Footer t={t.footer} contact={contact} year={year} />

        {loader === 'gone' || reduced ? null : (
          <div
            role="status"
            aria-label={t.loading}
            className={`landing-loader fixed inset-0 z-50 flex flex-col items-center justify-center bg-[var(--ink)] transition-opacity duration-700 ease-[ease] ${loader === 'leaving' ? 'opacity-0' : 'opacity-100'}`}
          >
            <p className="l-display text-[28px] tracking-[0.3em] uppercase sm:text-[34px]">{site.name}</p>
            <span className="relative mt-6 block h-px w-[140px] bg-[rgba(244,238,227,0.15)]">
              <span ref={fill} className="absolute inset-y-0 left-0 w-0 bg-[var(--champagne)]" />
            </span>
            <span ref={percent} className="l-eyebrow mt-4 text-[var(--ivory-muted)]">
              0%
            </span>
          </div>
        )}
      </div>
    </EngineContext>
  )
}
