'use client'

import { Info } from 'lucide-react'
import { useAuth } from '@/components/auth/AuthProvider'

/**
 * A reminder for the team, never for visitors: shown on the legal pages to a signed-in
 * admin while the company details in the console are still the placeholders.
 */
export function OperatorNotice({ text }: { text: string }) {
  const { user } = useAuth()
  if (user?.role !== 'admin' && user?.role !== 'superadmin') return null
  return (
    <p className="mb-6 flex items-start gap-3 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-900">
      <Info aria-hidden className="mt-0.5 size-4 shrink-0" />
      {text}
    </p>
  )
}
