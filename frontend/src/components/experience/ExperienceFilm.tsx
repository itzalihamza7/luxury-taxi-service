'use client'

import Lenis from 'lenis'
import 'lenis/dist/lenis.css'
import { useEffect, useRef, type ReactNode } from 'react'
import { Accent, Eyebrow } from '@/components/ui/Section'
import type { PageMessages } from '@/i18n/messages/pages'
import { FILM } from './film'
import { applyStage, clamp, fade, prefersReducedMotion, useReducedMotion } from './motion'

const MOBILE = '(max-width: 767px)'
/** How quickly the film catches up with the scroll: 12% of the way per frame at 60 Hz, the same at any refresh rate. */
const CATCH_UP = 7.7

// Darker at the top, under the navigation, and at the bottom, under the words.
const SCRIM_DESKTOP = 'linear-gradient(to bottom, rgba(8,12,19,0.55) 0%, rgba(8,12,19,0) 24%, rgba(8,12,19,0) 45%, rgba(8,12,19,0.82) 100%)'
// On a phone the headline sits at the top, over the bright trees: the shade there runs deeper.
const SCRIM_MOBILE = 'linear-gradient(to bottom, rgba(8,12,19,0.78) 0%, rgba(8,12,19,0.55) 32%, rgba(8,12,19,0) 52%, rgba(8,12,19,0) 56%, rgba(8,12,19,0.85) 100%)'

/** Downloads a film in full, so seeks never wait for the network. Falls back to streaming it from its address. */
async function download(src: string, signal: AbortSignal, priority: RequestPriority = 'auto'): Promise<string> {
  try {
    const response = await fetch(src, { signal, priority })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    return URL.createObjectURL(await response.blob())
  } catch (error) {
    if (signal.aborted) throw error
    return src
  }
}

/**
 * Asks a film for one frame (its middle, so rounding never lands on a neighbour), unless the
 * film was already asked for it or is still busy with the last request.
 */
function seekTo(film: HTMLVideoElement, frame: number, asked: WeakMap<HTMLVideoElement, number>) {
  if (film.seeking || asked.get(film) === frame) return
  asked.set(film, frame)
  film.currentTime = (frame + 0.5) / FILM.fps
}

/**
 * The film of the car's arrival, played by the scroll: a 500vh section whose sticky screen
 * shows it, with three moments of words over it. One frame loop advances the smooth scroll
 * (Lenis), eases the film towards the scroll position and writes every per-frame value
 * straight to the DOM, never to React state.
 */
export function ExperienceFilm({ t, actions }: { t: PageMessages['experience']['film']; actions: ReactNode }) {
  const still = useReducedMotion()
  const section = useRef<HTMLElement>(null)
  const preview = useRef<HTMLVideoElement>(null)
  const hd = useRef<HTMLVideoElement>(null)
  const opening = useRef<HTMLImageElement>(null)
  const arrival = useRef<HTMLDivElement>(null)
  const cue = useRef<HTMLDivElement>(null)
  const approach = useRef<HTMLDivElement>(null)
  const inside = useRef<HTMLDivElement>(null)
  const progress = useRef<HTMLDivElement>(null)
  /** The frame the film should show now. */
  const wanted = useRef(0)
  /** The frame each film was last asked for. */
  const asked = useRef(new WeakMap<HTMLVideoElement, number>())

  // The smooth scroll (not for visitors who prefer less motion) and the one frame loop.
  useEffect(() => {
    const mobile = window.matchMedia(MOBILE)
    const smooth = still || prefersReducedMotion() ? null : new Lenis({ lerp: 0.08, smoothWheel: true, autoRaf: false })
    /** The film's position in frames, eased towards the scroll; null until a film can play. */
    let eased: number | null = null
    let last = 0
    let id = 0

    const update = (dt: number) => {
      const element = section.current
      if (!element) return
      if (still) {
        applyStage(inside.current, 1)
        return
      }
      const scrollable = element.offsetHeight - window.innerHeight
      const p = scrollable > 0 ? clamp((window.scrollY - element.offsetTop) / scrollable) : 0

      // The films marked ready below follow the scroll: the light one first, then the full-quality one above it.
      const full = hd.current
      const films = [preview.current, full].filter((film): film is HTMLVideoElement => film?.dataset.ready === 'true')
      const [lead] = films
      if (lead) {
        const target = p * (Math.round(lead.duration * FILM.fps) - 1)
        // A film that arrives after the visitor has scrolled starts where they are, rather than replaying the way there.
        eased = eased === null ? target : eased + (target - eased) * (1 - Math.exp(-dt * CATCH_UP))
        wanted.current = Math.round(eased)
        // Checked before this frame's seeks: the full-quality film fades in once it shows the wanted frame.
        if (full?.dataset.ready === 'true' && full.dataset.shown !== 'true' && !full.seeking && asked.current.get(full) === wanted.current) {
          full.dataset.shown = 'true'
        }
        for (const film of films) seekTo(film, wanted.current, asked.current)
      }
      // The sharp first frame lies over the light film while the film rests on that frame.
      opening.current?.toggleAttribute('data-hidden', wanted.current > 0)

      // On a portrait screen the approaching car starts on the left of the frame: follow it to the centre.
      const position = mobile.matches ? `${(20 + 30 * clamp(p / 0.2)).toFixed(1)}% center` : 'center center'
      for (const layer of [preview.current, opening.current, full]) {
        if (layer && layer.dataset.framing !== position) {
          layer.dataset.framing = position
          layer.style.objectPosition = position
        }
      }

      applyStage(arrival.current, fade(p, -1, 0, 0.06, 0.14))
      applyStage(approach.current, fade(p, 0.38, 0.44, 0.58, 0.64))
      applyStage(inside.current, fade(p, 0.84, 0.92, 2, 3))
      if (cue.current) cue.current.style.opacity = (1 - clamp(p / 0.03)).toFixed(3)
      if (progress.current) progress.current.style.transform = `scaleX(${p.toFixed(4)})`
    }

    const loop = (time: number) => {
      smooth?.raf(time)
      update(last ? Math.min(0.1, (time - last) / 1000) : 0)
      last = time
      id = window.requestAnimationFrame(loop)
    }
    id = window.requestAnimationFrame(loop)
    return () => {
      window.cancelAnimationFrame(id)
      smooth?.destroy()
    }
  }, [still])

  // The films: the light one as soon as possible, then the full-quality one in the background.
  useEffect(() => {
    if (still || prefersReducedMotion()) return
    const light = preview.current
    const full = hd.current
    if (!light || !full) return
    const controller = new AbortController()
    const { signal } = controller
    const urls: string[] = []

    /** Plays a downloaded film in `element`, then hands it to the frame loop. */
    const use = (element: HTMLVideoElement, url: string) => {
      if (url.startsWith('blob:')) urls.push(url)
      element.addEventListener(
        'loadeddata',
        () => {
          // iOS shows nothing for a video that has never played: play and pause once.
          element
            .play()
            .then(() => element.pause())
            .catch(() => undefined)
            .finally(() => {
              element.dataset.ready = 'true'
            })
        },
        { once: true, signal },
      )
      // A seek that ends while the scroll has moved on asks for the next frame at once, not at the next repaint.
      element.addEventListener(
        'seeked',
        () => {
          if (element.dataset.ready === 'true') seekTo(element, wanted.current, asked.current)
        },
        { signal },
      )
      element.src = url
      element.load()
    }

    // Once the full-quality film has faded in over it, the light one is let go.
    full.addEventListener(
      'transitionend',
      () => {
        delete light.dataset.ready
        light.removeAttribute('src')
        light.load()
      },
      { once: true, signal },
    )

    download(FILM.preview, signal)
      .then((url) => {
        use(light, url)
        // Low priority: whatever else the page asks for goes first.
        return download(FILM.hd, signal, 'low')
      })
      .then((url) => use(full, url))
      .catch(() => undefined)

    return () => {
      controller.abort()
      for (const url of urls) URL.revokeObjectURL(url)
    }
  }, [still])

  return (
    <section ref={section} aria-label={t.label} className="on-dark relative bg-ink-950 text-bone-50" style={{ height: still ? '100svh' : '500vh' }}>
      <div className="sticky top-0 h-svh overflow-hidden">
        {still ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element -- the moment the film ends on, shown as it is */}
            <img src={FILM.interior} alt="" className="absolute inset-0 size-full object-cover" />
            <h1 className="sr-only">
              <Accent text={t.arrival.title} />
            </h1>
          </>
        ) : (
          <>
            <video ref={preview} className="absolute inset-0 size-full object-cover" muted playsInline preload="auto" poster={FILM.poster} aria-hidden="true" />
            {/* The film's first frame at full sharpness, for the moment spent reading the headline. */}
            {/* eslint-disable-next-line @next/next/no-img-element -- the film's own first frame, the same file as its poster */}
            <img
              ref={opening}
              src={FILM.poster}
              alt=""
              fetchPriority="high"
              className="absolute inset-0 size-full object-cover object-[20%_center] transition-opacity duration-300 data-hidden:opacity-0 md:object-center"
            />
            <video
              ref={hd}
              className="absolute inset-0 size-full object-cover opacity-0 transition-opacity duration-700 data-[shown=true]:opacity-100"
              muted
              playsInline
              preload="auto"
              aria-hidden="true"
            />
          </>
        )}

        <div aria-hidden className="pointer-events-none absolute inset-0 md:hidden" style={{ background: SCRIM_MOBILE }} />
        <div aria-hidden className="pointer-events-none absolute inset-0 hidden md:block" style={{ background: SCRIM_DESKTOP }} />

        {still ? null : (
          <>
            {/* First, the arrival: the car starts small on the left, so the words sit bottom right (top left on a phone). */}
            <div
              ref={arrival}
              className="absolute inset-x-5 top-28 sm:inset-x-8 md:inset-x-auto md:top-auto md:right-12 md:bottom-48 md:max-w-[42rem] md:text-right lg:right-16 lg:bottom-36"
            >
              <Eyebrow onDark className="md:justify-end">
                {t.arrival.eyebrow}
              </Eyebrow>
              <h1 className="display mt-5 text-[clamp(3.25rem,8vw,7rem)] leading-[0.95]">
                <Accent text={t.arrival.title} />
              </h1>
            </div>

            <div ref={cue} aria-hidden className="pointer-events-none absolute bottom-24 left-1/2 flex -translate-x-1/2 flex-col items-center gap-4 lg:bottom-10">
              <span className="eyebrow whitespace-nowrap text-bone-100/70">{t.scroll}</span>
              <span className="relative h-10 w-px overflow-hidden bg-bone-50/25">
                <span className="absolute inset-x-0 top-0 h-3 animate-scroll-cue bg-gold-300" />
              </span>
            </div>

            {/* Then the approach, against the black paint of the car. */}
            <div ref={approach} className="absolute left-5 right-5 top-1/2 max-w-[36rem] -translate-y-1/2 sm:left-8 lg:left-16" style={{ opacity: 0 }}>
              <Eyebrow onDark>{t.approach.eyebrow}</Eyebrow>
              <h2 className="display mt-5 text-[clamp(2.75rem,6vw,5.5rem)] leading-[0.98]">
                <Accent text={t.approach.title} />
              </h2>
              <ul className="mt-8 border-b border-white/15">
                {t.approach.points.map((point) => (
                  <li key={point} className="border-t border-white/15 py-3 text-[0.9375rem] text-bone-100/75 sm:text-base">
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}

        {/* Last, inside: a card over the rear seats. Clear of the phone action bar below 1024 px. */}
        <div
          ref={inside}
          className="absolute inset-x-4 bottom-[5.5rem] rounded-md border border-white/10 bg-ink-950/80 p-7 sm:inset-x-8 sm:p-9 md:left-auto md:right-12 md:w-[30rem] lg:right-16 lg:bottom-20 lg:p-10"
          style={still ? undefined : { opacity: 0 }}
        >
          <Eyebrow onDark>{t.inside.eyebrow}</Eyebrow>
          <h2 className="display mt-4 text-[clamp(2.5rem,4.5vw,3.75rem)] leading-[1.02]">
            <Accent text={t.inside.title} />
          </h2>
          <p className="mt-4 max-w-[38ch] text-[0.9375rem] leading-relaxed text-bone-100/75 sm:text-base">{t.inside.text}</p>
          <div className="mt-8 flex flex-wrap gap-3">{actions}</div>
        </div>

        {still ? null : (
          <div
            ref={progress}
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-16 h-px origin-left bg-gold-300 lg:bottom-0"
            style={{ transform: 'scaleX(0)' }}
          />
        )}
      </div>
    </section>
  )
}
