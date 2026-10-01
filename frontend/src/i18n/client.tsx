'use client'

import { createContext, useContext, type ReactNode } from 'react'
import type { Locale } from './config'
import type { CommonMessages } from './messages/common'

interface I18nValue {
  locale: Locale
  /** Shared strings (navigation, actions, statuses, error messages). */
  t: CommonMessages
}

const I18nContext = createContext<I18nValue | null>(null)

export function I18nProvider({ locale, messages, children }: { locale: Locale; messages: CommonMessages; children: ReactNode }) {
  return <I18nContext value={{ locale, t: messages }}>{children}</I18nContext>
}

export function useI18n(): I18nValue {
  const value = useContext(I18nContext)
  if (!value) throw new Error('useI18n must be used inside <I18nProvider>')
  return value
}
