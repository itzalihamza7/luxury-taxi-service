'use client'

import { useEffect, useState, useSyncExternalStore } from 'react'
import { api } from './api'
import { DEFAULT_CONFIG, type AppConfig } from './types'

const noop = () => () => {}

/**
 * False while rendering on the server and during hydration, true afterwards.
 * Use it to hold back anything that depends on the browser (saved drafts, the
 * current time) without causing a hydration mismatch.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    noop,
    () => true,
    () => false,
  )
}

let pendingConfig: Promise<AppConfig> | null = null

export function loadAppConfig(): Promise<AppConfig> {
  pendingConfig ??= api<AppConfig>('/config').catch(() => {
    pendingConfig = null
    return DEFAULT_CONFIG
  })
  return pendingConfig
}

/** Business settings from the API (time zone, notice period, whether online payment is on). */
export function useAppConfig(): AppConfig {
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG)
  useEffect(() => {
    let active = true
    void loadAppConfig().then((loaded) => {
      if (active) setConfig(loaded)
    })
    return () => {
      active = false
    }
  }, [])
  return config
}
