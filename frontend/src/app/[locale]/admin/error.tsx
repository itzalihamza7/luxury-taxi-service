'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { useI18n } from '@/i18n/client'

/** Shown when a page of the admin panel fails to render. The menu stays in place. */
export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { t } = useI18n()

  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="rounded-xl border border-ink-900/10 bg-white px-6 py-14 text-center">
      <h2 className="text-lg font-semibold tracking-tight">{t.errorPage.title}</h2>
      <Button variant="dark" onClick={reset} className="mt-6">
        {t.actions.retry}
      </Button>
    </div>
  )
}
