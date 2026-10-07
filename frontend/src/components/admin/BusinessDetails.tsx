'use client'

import { useEffect, useState } from 'react'
import { FormMessage } from '@/components/ui/Field'
import { useI18n } from '@/i18n/client'
import type { ManageMessages } from '@/i18n/messages/manage'
import { api, errorMessage } from '@/lib/api'
import { settingsFields } from './definitions'
import { EntryForm, type Draft } from './EntryForm'

/** Phone, WhatsApp, email, social profiles and the company details used in the legal pages. */
export function BusinessDetails({ m }: { m: ManageMessages }) {
  const { t } = useI18n()
  const [settings, setSettings] = useState<Draft | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    api<{ settings: Draft }>('/admin/settings')
      .then((result) => {
        if (active) setSettings(result.settings)
      })
      .catch((caught: unknown) => {
        if (active) setError(errorMessage(caught, t))
      })
    return () => {
      active = false
    }
  }, [t])

  return (
    <div className="mt-6">
      <p className="max-w-3xl text-sm leading-relaxed text-ink-900/65">{m.business.lead}</p>
      {error ? (
        <div className="mt-5">
          <FormMessage tone="error">{error}</FormMessage>
        </div>
      ) : null}
      {settings ? (
        <div className="mt-5">
          <EntryForm
            title={m.tabs.business}
            fields={settingsFields(m)}
            initial={settings}
            m={m}
            onSave={async (draft) => {
              await api('/admin/settings', { method: 'PUT', body: draft })
            }}
          />
        </div>
      ) : error ? null : (
        <p className="py-10 text-sm text-ink-900/60">{t.loading}</p>
      )}
    </div>
  )
}
