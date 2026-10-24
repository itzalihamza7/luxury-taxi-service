'use client'

import { createContext, useContext, useEffect, useRef, useSyncExternalStore } from 'react'

/*
 * The home page runs on one requestAnimationFrame loop (started in `Landing`):
 * it advances the smooth scroll, then calls every registered frame callback.
 * Per-frame values (scroll progress, video time, opacity, transforms) are
 * written straight to DOM nodes, never to React state.
 */

export type FrameCallback = () => void

interface Engine {
  /** Run `callback` on every frame until the returned function is called. */
  onFrame: (callback: FrameCallback) => () => void
  /** Scroll smoothly to an element, a selector or a position. */
  scrollTo: (target: string | number | HTMLElement) => void
}

export const EngineContext = createContext<Engine | null>(null)

export function useEngine(): Engine {
  const engine = useContext(EngineContext)
  if (!engine) throw new Error('useEngine must be used inside <Landing>')
  return engine
}

/** Registers `callback` on the frame loop. The latest callback is always used, so it may close over fresh props. */
export function useFrame(callback: FrameCallback): void {
  const { onFrame } = useEngine()
  const latest = useRef(callback)
  useEffect(() => {
    latest.current = callback
  })
  useEffect(() => onFrame(() => latest.current()), [onFrame])
}

const reducedQuery = '(prefers-reduced-motion: reduce)'

/** Read directly, for effects that must decide before the first render with the real value. */
export const prefersReducedMotion = () => window.matchMedia(reducedQuery).matches

function subscribeReduced(onChange: () => void) {
  const query = window.matchMedia(reducedQuery)
  query.addEventListener('change', onChange)
  return () => query.removeEventListener('change', onChange)
}

/** Whether the visitor asked for less motion. False on the server and before hydration. */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeReduced,
    () => window.matchMedia(reducedQuery).matches,
    () => false,
  )
}

export const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value))

const smoothstep = (x: number) => x * x * (3 - 2 * x)

/**
 * 0 before `inStart`, rising to 1 by `inEnd`, 1 until `outStart`, falling to 0
 * by `outEnd`; both edges eased with smoothstep.
 */
export function fade(p: number, inStart: number, inEnd: number, outStart: number, outEnd: number): number {
  const rise = smoothstep(clamp((p - inStart) / (inEnd - inStart)))
  const fall = 1 - smoothstep(clamp((p - outStart) / (outEnd - outStart)))
  return Math.min(rise, fall)
}

/** Opacity, rise and focus for a text block at visibility `v`. Writes only when the value changed. */
export function applyStage(element: HTMLElement | null, v: number): void {
  if (!element) return
  const key = v.toFixed(3)
  if (element.dataset.v === key) return
  element.dataset.v = key
  element.style.opacity = key
  element.style.transform = `translateY(${((1 - v) * 24).toFixed(2)}px)`
  element.style.filter = v > 0.999 ? 'none' : `blur(${((1 - v) * 8).toFixed(2)}px)`
  // Out of sight, out of reach: no stray clicks or focus on an invisible card.
  element.inert = v < 0.5
}
