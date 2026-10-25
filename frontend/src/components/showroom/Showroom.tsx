'use client'

import dynamic from 'next/dynamic'
import { Component, useCallback, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react'
import { applyStage, clamp, fade, useReducedMotion } from '@/components/experience/motion'
import type { Pointer } from './ShowroomCanvas'

/** three.js and the model load only here, in the browser, after the page itself. */
const ShowroomCanvas = dynamic(() => import('./ShowroomCanvas'), { ssr: false })

const COMPACT = '(max-width: 1023px)'

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
  /** A still of the scene: shown at once, and instead of the 3D view where it cannot run. */
  still: ReactNode
  scroll: string
}

/**
 * The home page's opening: the car in a studio, in 3D. The section is pinned while the
 * visitor scrolls; the camera walks around the car and three blocks of words take turns.
 */
export function Showroom({ label, stages, still, scroll }: Props) {
  const reduced = useReducedMotion()
  const show3D = useSyncExternalStore(subscribeNever, canShow3D, () => false) && !reduced
  const compact = useSyncExternalStore(subscribeCompact, () => window.matchMedia(COMPACT).matches, () => false)
  const [ready, setReady] = useState(false)
  const [active, setActive] = useState(true)
  const section = useRef<HTMLElement>(null)
  const first = useRef<HTMLDivElement>(null)
  const second = useRef<HTMLDivElement>(null)
  const third = useRef<HTMLDivElement>(null)
  const cue = useRef<HTMLDivElement>(null)
  const progress = useRef(0)
  const pointer = useRef<Pointer>({ x: 0, y: 0 })
  const onReady = useCallback(() => setReady(true), [])

  // Scroll progress through the section, and the words that go with it.
  useEffect(() => {
    let id = 0
    const loop = () => {
      const element = section.current
      if (element) {
        const scrollable = element.offsetHeight - window.innerHeight
        const p = scrollable > 0 ? clamp(-element.getBoundingClientRect().top / scrollable) : 0
        progress.current = p
        applyStage(first.current, reduced ? 1 : fade(p, -1, 0, 0.12, 0.2))
        applyStage(second.current, reduced ? 0 : fade(p, 0.26, 0.33, 0.5, 0.57))
        applyStage(third.current, reduced ? 0 : fade(p, 0.6, 0.67, 0.86, 0.93))
        if (cue.current) cue.current.style.opacity = (1 - clamp(p / 0.04)).toFixed(3)
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

  const block = 'absolute inset-x-0 top-24 sm:top-28 lg:top-1/2 lg:max-w-xl lg:-translate-y-1/2'

  return (
    <section ref={section} aria-label={label} className="on-dark relative bg-ink-950 text-bone-100" style={{ height: reduced ? '100svh' : '280vh' }}>
      <div className="sticky top-0 h-svh overflow-hidden">
        <div className={`absolute inset-0 transition-opacity duration-1000 ${ready ? 'opacity-0' : 'opacity-100'}`}>{still}</div>
        {show3D ? (
          <div className={`absolute inset-0 transition-opacity duration-1000 ${ready ? 'opacity-100' : 'opacity-0'}`}>
            <Guard>
              <ShowroomCanvas progress={progress} pointer={pointer} active={active} compact={compact} onReady={onReady} />
            </Guard>
          </div>
        ) : null}

        {/* Shade behind the words: on the left of a wide screen, at the top of a tall one. */}
        <div aria-hidden className="pointer-events-none absolute inset-0 hidden bg-gradient-to-r from-ink-950/85 via-ink-950/30 to-transparent lg:block" />
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-b from-ink-950/90 via-ink-950/45 to-transparent lg:hidden" />

        <div className="container-page relative h-full">
          <div className="relative h-full">
            <div ref={first} className={block}>
              {stages[0]}
            </div>
            <div ref={second} className={block} style={{ opacity: 0 }}>
              {stages[1]}
            </div>
            <div ref={third} className={block} style={{ opacity: 0 }}>
              {stages[2]}
            </div>
          </div>
        </div>

        {reduced ? null : (
          <div ref={cue} aria-hidden className="pointer-events-none absolute bottom-24 left-1/2 flex -translate-x-1/2 flex-col items-center gap-4 lg:bottom-10">
            <span className="eyebrow whitespace-nowrap text-bone-100/70">{scroll}</span>
            <span className="relative h-10 w-px overflow-hidden bg-bone-50/25">
              <span className="absolute inset-x-0 top-0 h-3 animate-scroll-cue bg-gold-300" />
            </span>
          </div>
        )}

      </div>
    </section>
  )
}
