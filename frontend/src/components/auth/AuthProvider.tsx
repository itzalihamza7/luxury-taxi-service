'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api } from '@/lib/api'
import type { User } from '@/lib/types'

interface AuthValue {
  user: User | null
  /** False until the first session check has finished. */
  ready: boolean
  setUser: (user: User | null) => void
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthValue | null>(null)

/**
 * Knows who is signed in. The session lives in an HttpOnly cookie, so this
 * asks the API once per page load instead of reading anything in the browser.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let active = true
    api<{ user: User | null }>('/auth/me')
      .then((result) => {
        if (active) setUser(result.user)
      })
      .catch(() => {
        // Signed-out is the safe assumption if the check fails.
      })
      .finally(() => {
        if (active) setReady(true)
      })
    return () => {
      active = false
    }
  }, [])

  const signOut = useCallback(async () => {
    await api('/auth/logout', { method: 'POST' }).catch(() => undefined)
    setUser(null)
  }, [])

  const value = useMemo(() => ({ user, ready, setUser, signOut }), [user, ready, signOut])
  return <AuthContext value={value}>{children}</AuthContext>
}

export function useAuth(): AuthValue {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used inside <AuthProvider>')
  return value
}
