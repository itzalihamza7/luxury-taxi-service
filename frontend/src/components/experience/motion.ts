import { useSyncExternalStore } from 'react'

const reducedQuery = '(prefers-reduced-motion: reduce)'

/** Read directly, for effects that must decide with the real value before the first render settles. */
export const prefersReducedMotion = () => window.matchMedia(reducedQuery).matches

function subscribeReduced(onChange: () => void) {
  const query = window.matchMedia(reducedQuery)
  query.addEventListener('change', onChange)
  return () => query.removeEventListener('change', onChange)
}

/** Whether the visitor asked for less motion. False on the server and before hydration. */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribeReduced, prefersReducedMotion, () => false)
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

/**
 * Opacity and rise for a block of words at visibility `v`, written only when it
 * changed. Opacity and transform alone keep the work on the compositor while the
 * film plays underneath.
 */
export function applyStage(element: HTMLElement | null, v: number): void {
  if (!element) return
  const key = v.toFixed(3)
  if (element.dataset.v === key) return
  element.dataset.v = key
  element.style.opacity = key
  element.style.transform = `translate3d(0, ${((1 - v) * 24).toFixed(2)}px, 0)`
  // Out of sight, out of reach: no stray clicks or focus on an invisible card.
  element.inert = v < 0.5
}
