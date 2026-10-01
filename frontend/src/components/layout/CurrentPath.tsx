'use client'

import { usePathname } from 'next/navigation'
import { Suspense, useEffect, useSyncExternalStore } from 'react'

/**
 * The current address, for layout components that need it (language switch,
 * mobile action bar).
 *
 * Reading `usePathname()` directly in those components has two costs here: it
 * cannot be prerendered for pages whose address is only known at request time,
 * and a component that hydrates late can see a newer address than the HTML it
 * is hydrating, which React reports as a mismatch. So one invisible component
 * reads the router and publishes the value, and everything visible subscribes
 * with a stable "not known yet" value on the server.
 */

let current: string | null = null
const listeners = new Set<() => void>()

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function Tracker() {
  const pathname = usePathname()
  useEffect(() => {
    current = pathname
    for (const listener of listeners) listener()
  }, [pathname])
  return null
}

/** Mount once, in the root layout. Renders nothing. */
export function PathnameTracker() {
  return (
    <Suspense fallback={null}>
      <Tracker />
    </Suspense>
  )
}

/** The current pathname, or `null` on the server and until the page is interactive. */
export function useCurrentPath(): string | null {
  return useSyncExternalStore(
    subscribe,
    () => current,
    () => null,
  )
}
