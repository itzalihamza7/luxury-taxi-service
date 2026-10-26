'use client'

import { ArrowDown } from 'lucide-react'
import dynamic from 'next/dynamic'
import { Component, useCallback, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react'
import { applyStage, clamp, fade, useReducedMotion } from '@/components/experience/motion'
import type { Frame, Pointer } from './ShowroomCanvas'

/** three.js and the model load only here, in the browser, after the page itself. */
const ShowroomCanvas = dynamic(() => import('./ShowroomCanvas'), { ssr: false })

const COMPACT = '(max-width: 1023px)'
/** Words beside the car on a landscape screen, above it on a portrait one: the `wide` variant in globals.css. */
const WIDE = '(min-aspect-ratio: 11/10)'

/*
 * Scroll progress through the section (0 to 1) at which each block of words comes in and goes out.
 * There is always one on screen: the next rises as the last one leaves, and the third stays to the
 * end. The camera (ShowroomCanvas) reaches its station for each block at CHAPTER_AT.
 */
const BLOCKS: [number, number, number, number][] = [
  [-1, 0, 0.22, 0.28],
  [0.28, 0.34, 0.58, 0.64],
  [0.64, 0.7, 2, 3],
]
const CHAPTER_START = [0, 0.28, 0.64, 1]
const CHAPTER_AT = [0, 0.46, 0.84]

let capable: boolean | undefined
/** WebGL is there, and the visitor has not asked to save data. Decided once per visit. */
function canShow3D(): boolean {
  if (capable === undefined) {
    let webgl = false
    try {
      const canvas = document.createElement('canvas')
      const context = canvas.getContext('webgl2') ?? canvas.getContext('webgl')
      webgl = context !== null
      context?.getExtension('WEBGL_lose_context')?.loseContext()
    } catch {
      webgl = false
    }
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection
    capable = webgl && !connection?.saveData
  }
  return capable
}
const subscribeNever = () => () => undefined

function subscribeCompact(onChange: () => void) {
  const query = window.matchMedia(COMPACT)
  query.addEventListener('change', onChange)
  return () => query.removeEventListener('change', onChange)
}

/** An element's position inside one of its positioned ancestors, before any transform. */
function offsetIn(element: HTMLElement, ancestor: HTMLElement) {
  let left = 0
  let top = 0
  let node: HTMLElement | null = element
  while (node && node !== ancestor) {
    left += node.offsetLeft
    top += node.offsetTop
    node = node.offsetParent as HTMLElement | null
  }
  return { left, top }
}

/** If the 3D view fails (a lost GPU context, a model that does not load), the still simply stays. */
class Guard extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  render() {
    return this.state.failed ? null : this.props.children
  }
}

interface Props {
  label: string
  /** The three blocks of words, in order. The first holds the page's h1. */
  stages: [ReactNode, ReactNode, ReactNode]
  /** A short name for each block, for the chapter bar. */
  chapters: string[]
  /** A still of the scene: shown at once, and instead of the 3D view where it cannot run. */
  still: ReactNode
  scroll: string
  /** The way out of the showroom, for visitors who came to book. */
  skip: { href: string; label: string }
}

/**
 * The home page's opening: the car in 3D. The section is pinned while the visitor scrolls; the
 * camera walks round the car, three blocks of words take turns and a chapter bar shows the way.
 */
export function Showroom({ label, stages, chapters, still, scroll, skip }: Props) {
  const reduced = useReducedMotion()
  const show3D = useSyncExternalStore(subscribeNever, canShow3D, () => false) && !reduced
  const compact = useSyncExternalStore(subscribeCompact, () => window.matchMedia(COMPACT).matches, () => false)
  const [ready, setReady] = useState(false)
  const [active, setActive] = useState(true)
  const [chapter, setChapter] = useState(0)
  const section = useRef<HTMLElement>(null)
  const stage = useRef<HTMLDivElement>(null)
  const blocks = useRef<(HTMLDivElement | null)[]>([])
  const bar = useRef<HTMLDivElement>(null)
  const fills = useRef<(HTMLSpanElement | null)[]>([])
  const cue = useRef<HTMLDivElement>(null)
  const progress = useRef(0)
  const pointer = useRef<Pointer>({ x: 0, y: 0 })
  const frame = useRef<Frame>({ left: 0, top: 0, right: 1, bottom: 1 })
  const rooms = useRef<Frame[]>([])
  const onReady = useCallback(() => setReady(true), [])

  // The room each block of words leaves for the car: beside it on a wide screen, below it on a tall one.
  useEffect(() => {
    const host = stage.current
    if (!host) return
    const measure = () => {
      const width = host.clientWidth
      const height = host.clientHeight
      const wide = window.matchMedia(WIDE).matches
      // Clear of the header above and the chapter bar below (or, where the bar is hidden, the phone's bar of buttons).
      const top = 88
      const bottom = bar.current?.offsetParent ? offsetIn(bar.current, host).top - 16 : height - (window.matchMedia(COMPACT).matches ? 64 : 0) - 24
      rooms.current = blocks.current.map((block): Frame => {
        if (!block) return { left: 16, top, right: width - 16, bottom }
        const at = offsetIn(block, host)
        if (wide) return { left: Math.max(at.left + block.offsetWidth + 40, width * 0.42), top, right: width - Math.max(24, width * 0.03), bottom }
        // On a very short screen the car may sit under the last line of words rather than shrink to nothing; on a tablet it keeps some air either side.
        const side = Math.max(16, (width - 680) / 2)
        return { left: side, top: Math.min(at.top + block.offsetHeight + 20, bottom - height * 0.2), right: width - side, bottom }
      })
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(host)
    for (const block of blocks.current) if (block) observer.observe(block)
    if (bar.current) observer.observe(bar.current)
    return () => observer.disconnect()
  }, [])

  // Scroll progress through the section, and the words, chapter bar and room for the car that go with it.
  useEffect(() => {
    let id = 0
    let shown = 0
    const loop = () => {
      const element = section.current
      if (element) {
        const scrollable = element.offsetHeight - window.innerHeight
        const p = scrollable > 0 ? clamp(-element.getBoundingClientRect().top / scrollable) : 0
        progress.current = p
        BLOCKS.forEach(([inStart, inEnd, outStart, outEnd], index) => {
          applyStage(blocks.current[index] ?? null, reduced ? (index === 0 ? 1 : 0) : fade(p, inStart, inEnd, outStart, outEnd))
        })
        let current = 0
        for (let index = 0; index < BLOCKS.length; index++) {
          const start = CHAPTER_START[index] ?? 0
          const end = CHAPTER_START[index + 1] ?? 1
          if (p >= start) current = index
          const fill = fills.current[index]
          if (fill) fill.style.scale = `${clamp((p - start) / (end - start)).toFixed(3)} 1`
        }
        frame.current = rooms.current[current] ?? frame.current
        if (current !== shown) {
          shown = current
          setChapter(current)
        }
        if (cue.current) cue.current.style.opacity = (1 - clamp(p / 0.05)).toFixed(3)
      }
      id = window.requestAnimationFrame(loop)
    }
    id = window.requestAnimationFrame(loop)
    return () => window.cancelAnimationFrame(id)
  }, [reduced])

  // The car turns a little towards the pointer.
  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      pointer.current = { x: (event.clientX / window.innerWidth) * 2 - 1, y: 1 - (event.clientY / window.innerHeight) * 2 }
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => window.removeEventListener('pointermove', onMove)
  }, [])

  // Nothing is drawn while the section is off screen.
  useEffect(() => {
    const element = section.current
    if (!element) return
    const observer = new IntersectionObserver(([entry]) => setActive(entry?.isIntersecting ?? false), { rootMargin: '200px 0px' })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  /** Scrolls to the point where a chapter's words are in full and the camera has reached its station. */
  const go = (index: number) => {
    const element = section.current
    if (!element) return
    const scrollable = element.offsetHeight - window.innerHeight
    window.scrollTo({ top: window.scrollY + element.getBoundingClientRect().top + (CHAPTER_AT[index] ?? 0) * scrollable, behavior: 'smooth' })
  }

  const block = 'absolute inset-x-0 top-24 sm:top-28 wide:top-1/2 wide:max-w-md wide:-translate-y-1/2 xl:wide:max-w-xl'
  const number = (index: number) => String(index + 1).padStart(2, '0')
  const skipLink = (
    <a href={skip.href} className="eyebrow group inline-flex shrink-0 items-center gap-2 py-2 text-bone-100/75 transition-colors hover:text-gold-300">
      {skip.label}
      <ArrowDown aria-hidden className="size-3.5 transition-transform duration-300 group-hover:translate-y-0.5" />
    </a>
  )

  return (
    <section ref={section} aria-label={label} className="on-dark relative bg-ink-950 text-bone-100" style={{ height: reduced ? '100svh' : '240vh' }}>
      <div ref={stage} className="sticky top-0 h-svh overflow-hidden">
        <div className={`absolute inset-0 transition-opacity duration-1000 ${ready ? 'opacity-0' : 'opacity-100'}`}>{still}</div>
        {show3D ? (
          <div className={`absolute inset-0 transition-opacity duration-1000 ${ready ? 'opacity-100' : 'opacity-0'}`}>
            <Guard>
              <ShowroomCanvas progress={progress} pointer={pointer} frame={frame} active={active} compact={compact} onReady={onReady} />
            </Guard>
          </div>
        ) : null}

        {/* Shade behind the words (on the left of a wide screen, at the top of a tall one) and behind the chapter bar. */}
        <div aria-hidden className="pointer-events-none absolute inset-0 hidden bg-gradient-to-r from-ink-950/85 via-ink-950/30 to-transparent wide:block" />
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-b from-ink-950/90 via-ink-950/40 to-transparent wide:hidden" />
        <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-ink-950/85 to-transparent" />

        <div className="container-page relative h-full">
          <div className="relative h-full">
            {stages.map((content, index) => (
              <div
                key={index}
                ref={(element) => {
                  blocks.current[index] = element
                }}
                className={block}
                style={index === 0 ? undefined : { opacity: 0 }}
              >
                {content}
              </div>
            ))}
          </div>
        </div>

        {reduced ? null : (
          <div ref={bar} className="absolute inset-x-0 bottom-[4.5rem] low:hidden lg:bottom-7">
            <div className="container-page">
              <div className="flex items-end gap-5 sm:gap-10">
                {/* The chapters: bars on a phone, named from a tablet up. */}
                <ol className="flex flex-1 gap-1.5 sm:gap-6 lg:max-w-2xl">
                  {chapters.map((name, index) => (
                    <li key={index} className="flex-1">
                      <button
                        type="button"
                        onClick={() => go(index)}
                        aria-label={`${number(index)} ${name}`}
                        aria-current={index === chapter ? 'step' : undefined}
                        className="group block w-full py-3 text-left"
                      >
                        <span className={`eyebrow hidden gap-2.5 transition-colors sm:flex ${index === chapter ? 'text-bone-50' : 'text-bone-100/50 group-hover:text-bone-100/85'}`}>
                          <span className="text-gold-300">{number(index)}</span>
                          {name}
                        </span>
                        <span className="block h-0.5 overflow-hidden rounded-full bg-bone-50/15 sm:mt-3 sm:h-px">
                          <span
                            ref={(element) => {
                              fills.current[index] = element
                            }}
                            className="block h-full origin-left scale-x-0 bg-gold-300"
                          />
                        </span>
                      </button>
                    </li>
                  ))}
                </ol>
                <div className="sm:pb-1">{skipLink}</div>
              </div>
            </div>
            {/* The invitation to scroll, on screens with room for it; it goes as soon as the visitor does. */}
            <div ref={cue} aria-hidden className="pointer-events-none absolute bottom-full left-1/2 mb-8 hidden -translate-x-1/2 flex-col items-center gap-3 lg:flex">
              <span className="eyebrow whitespace-nowrap text-bone-100/70">{scroll}</span>
              <span className="relative h-8 w-px overflow-hidden bg-bone-50/25">
                <span className="absolute inset-x-0 top-0 h-3 animate-scroll-cue bg-gold-300" />
              </span>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
