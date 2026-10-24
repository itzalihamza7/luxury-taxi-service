'use client'

import { useRef, type RefObject } from 'react'
import type { LandingMessages } from '@/i18n/messages/landing'
import { whatsappHref } from '@/lib/contact'
import { applyStage, clamp, fade, useEngine, useFrame } from './engine'
import { Headline } from './type'

export const POSTER = '/video/maybach-poster.jpg'
export const INTERIOR = '/video/maybach-interior.jpg'

const GRAIN = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`

const SCRIM_DESKTOP = 'linear-gradient(to bottom, rgba(14,11,8,0.45) 0%, rgba(14,11,8,0) 22%, rgba(14,11,8,0) 40%, rgba(14,11,8,0.8) 100%)'
const SCRIM_MOBILE = 'linear-gradient(to bottom, rgba(14,11,8,0.6) 0%, rgba(14,11,8,0) 38%, rgba(14,11,8,0) 40%, rgba(14,11,8,0.8) 100%)'

/** One frame at 48 fps: closer than this, a seek is not worth asking the decoder for. */
const SEEK_THRESHOLD = 1 / 48

interface Props {
  t: LandingMessages['drive']
  whatsapp: string | null
  sectionRef: RefObject<HTMLElement | null>
  videoRef: RefObject<HTMLVideoElement | null>
  /** Below 768 px: the car is framed differently on a portrait screen. */
  mobileRef: RefObject<boolean>
  /** A still picture instead of the scrubbed video. */
  still: boolean
}

/** Pill buttons of the closing card. */
export const pillPrimary = 'inline-flex items-center justify-center rounded-full bg-[var(--ivory)] px-7 py-3.5 text-[14px] font-medium text-[var(--ink)] transition-colors duration-300 hover:bg-[var(--champagne)]'
export const pillOutline = 'inline-flex items-center justify-center gap-2 rounded-full border border-[rgba(244,238,227,0.6)] px-7 py-3.5 text-[14px] text-[var(--ivory)] transition-colors duration-300 hover:bg-[var(--ivory)] hover:text-[var(--ink)]'

export function ChatIcon() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 11.5a8.4 8.4 0 0 1-12.4 7.4L3 20.5l1.6-5.4A8.4 8.4 0 1 1 21 11.5Z" />
    </svg>
  )
}

/**
 * "The drive": a 500vh section whose sticky screen shows the film. Scrolling
 * scrubs it: the Maybach comes up the boulevard, the camera passes along its
 * side, the rear door opens and the camera settles on the rear seats.
 */
export function Drive({ t, whatsapp, sectionRef, videoRef, mobileRef, still }: Props) {
  const { scrollTo } = useEngine()
  const arrival = useRef<HTMLDivElement>(null)
  const cue = useRef<HTMLDivElement>(null)
  const approach = useRef<HTMLDivElement>(null)
  const inside = useRef<HTMLDivElement>(null)
  const progress = useRef<HTMLDivElement>(null)
  /** The video time being eased towards the scroll position. */
  const current = useRef(0)
  const framing = useRef('')

  useFrame(() => {
    const section = sectionRef.current
    if (!section) return
    if (still) {
      applyStage(inside.current, 1)
      return
    }
    const scrollable = section.offsetHeight - window.innerHeight
    const p = scrollable > 0 ? clamp((window.scrollY - section.offsetTop) / scrollable) : 0

    const video = videoRef.current
    if (video && Number.isFinite(video.duration) && video.duration > 0) {
      const target = p * (video.duration - 0.05)
      current.current += (target - current.current) * 0.12
      if (Math.abs(current.current - video.currentTime) > SEEK_THRESHOLD && !video.seeking) video.currentTime = current.current
      // On a portrait screen the approaching car starts on the left of the frame: follow it to the centre.
      const position = mobileRef.current ? `${(20 + 30 * clamp(p / 0.2)).toFixed(1)}% center` : 'center center'
      if (position !== framing.current) {
        framing.current = position
        video.style.objectPosition = position
      }
    }

    applyStage(arrival.current, fade(p, -1, 0, 0.06, 0.14))
    applyStage(approach.current, fade(p, 0.38, 0.44, 0.58, 0.64))
    applyStage(inside.current, fade(p, 0.84, 0.92, 2, 3))
    if (cue.current) cue.current.style.opacity = (1 - clamp(p / 0.03)).toFixed(3)
    if (progress.current) progress.current.style.width = `${(p * 100).toFixed(2)}%`
  })

  const eyebrow = 'l-eyebrow text-[var(--ivory-muted)]'

  return (
    <section ref={sectionRef} id="drive" aria-label={t.label} className="relative" style={{ height: still ? '100svh' : '500vh' }}>
      <div className="sticky top-0 h-[100svh] overflow-hidden">
        {still ? (
          // eslint-disable-next-line @next/next/no-img-element -- the same still the film ends on, shown as is
          <img src={INTERIOR} alt="" className="absolute inset-0 size-full object-cover" />
        ) : (
          <video ref={videoRef} className="absolute inset-0 size-full object-cover" muted playsInline preload="auto" poster={POSTER} aria-hidden="true" />
        )}

        {/* Scrim: darker at the top for the navigation and at the bottom for the words. */}
        <div aria-hidden className="pointer-events-none absolute inset-0 md:hidden" style={{ background: SCRIM_MOBILE }} />
        <div aria-hidden className="pointer-events-none absolute inset-0 hidden md:block" style={{ background: SCRIM_DESKTOP }} />
        {/* Film grain. */}
        <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.07] mix-blend-overlay" style={{ backgroundImage: GRAIN }} />

        {still ? null : (
          <>
            {/* Stage 1, the arrival: the car starts small on the left, so the words sit bottom right (top left on a phone). */}
            <div ref={arrival} className="pointer-events-none absolute left-6 right-6 top-28 text-left md:left-auto md:right-10 md:top-auto md:bottom-16 md:max-w-[620px] md:text-right lg:right-16 lg:bottom-20">
              <p className={`${eyebrow} mb-4`}>{t.arrival.eyebrow}</p>
              <Headline as="h1" lines={t.arrival.lines} className="text-[clamp(52px,8vw,112px)] leading-[0.95]" />
            </div>

            <div ref={cue} aria-hidden className="pointer-events-none absolute bottom-8 left-1/2 flex -translate-x-1/2 flex-col items-center gap-4">
              <span className={`${eyebrow} whitespace-nowrap`}>{t.scroll}</span>
              <span className="relative h-10 w-px overflow-hidden bg-[rgba(244,238,227,0.3)]">
                <span className="absolute inset-x-0 top-0 h-3 animate-[scroll-cue-run_2s_ease-in-out_infinite] bg-[var(--champagne)]" />
              </span>
            </div>

            {/* Stage 2, the approach: against the black paint of the car. */}
            <div ref={approach} className="pointer-events-none absolute left-6 top-1/2 max-w-[560px] -translate-y-1/2 sm:left-10 lg:left-16" style={{ opacity: 0 }}>
              <p className={`${eyebrow} mb-4`}>{t.approach.eyebrow}</p>
              <Headline lines={t.approach.lines} className="text-[clamp(44px,6vw,88px)] leading-[0.98]" />
              <ul className="mt-8 border-b border-[rgba(244,238,227,0.15)]">
                {t.approach.points.map((point) => (
                  <li key={point} className="border-t border-[rgba(244,238,227,0.15)] py-3 text-[15px] text-[var(--ivory-muted)] sm:text-[16px]">
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}

        {/* Stage 3, inside: a glass card over the rear seats. */}
        <div
          ref={inside}
          className="pointer-events-none absolute bottom-6 left-4 right-4 rounded-[4px] border border-[rgba(244,238,227,0.12)] bg-[rgba(14,11,8,0.55)] p-7 backdrop-blur-[20px] backdrop-saturate-[1.2] md:left-auto md:right-10 md:bottom-16 md:w-[480px] md:p-10 lg:right-16 lg:bottom-20"
          style={still ? undefined : { opacity: 0 }}
        >
          <p className="l-eyebrow text-[var(--champagne)]">{t.inside.eyebrow}</p>
          <h2 className="l-display mt-3 text-[clamp(40px,4.5vw,64px)] leading-[1.02]">{t.inside.title}</h2>
          <p className="mt-4 max-w-[38ch] text-[15px] text-[var(--ivory-muted)] sm:text-[16px]">{t.inside.text}</p>
          <div className="pointer-events-auto mt-8 flex flex-wrap gap-3">
            <button type="button" onClick={() => scrollTo('#booking')} className={pillPrimary}>
              {t.inside.book}
            </button>
            {whatsapp ? (
              <a href={whatsappHref(whatsapp)} target="_blank" rel="noopener noreferrer" className={pillOutline}>
                <ChatIcon />
                {t.inside.whatsapp}
              </a>
            ) : null}
          </div>
        </div>

        {still ? null : <div ref={progress} aria-hidden className="pointer-events-none absolute bottom-0 left-0 h-px w-0 bg-[var(--champagne)]" />}
      </div>
    </section>
  )
}
