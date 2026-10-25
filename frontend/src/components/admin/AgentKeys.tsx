'use client'

import { Check, Copy, KeyRound } from 'lucide-react'
import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/Button'
import { FormMessage, TextField } from '@/components/ui/Field'
import { useI18n } from '@/i18n/client'
import { fill } from '@/i18n/config'
import type { ManageMessages } from '@/i18n/messages/manage'
import { api, errorMessage } from '@/lib/api'
import { formatDate } from '@/lib/format'
import { Card, CardHeader, Empty } from './ui'

interface AgentKey {
  id: string
  name: string
  prefix: string
  createdAt: string
  lastUsedAt: string | null
  revokedAt: string | null
}

/** Keys for the AI phone agent: create one (shown once), see when each was last used, revoke. */
export function AgentKeys({ m }: { m: ManageMessages }) {
  const { t, locale } = useI18n()
  const copy = m.agentKeys
  const [keys, setKeys] = useState<AgentKey[] | null>(null)
  const [name, setName] = useState('')
  const [created, setCreated] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    const result = await api<{ keys: AgentKey[] }>('/admin/agent-keys')
    setKeys(result.keys)
  }, [])

  useEffect(() => {
    let active = true
    api<{ keys: AgentKey[] }>('/admin/agent-keys')
      .then((result) => {
        if (active) setKeys(result.keys)
      })
      .catch((caught: unknown) => {
        if (active) setError(errorMessage(caught, t))
      })
    return () => {
      active = false
    }
  }, [t])

  async function create(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const result = await api<{ key: string }>('/admin/agent-keys', { method: 'POST', body: { name: name.trim() || copy.namePlaceholder } })
      setCreated(result.key)
      setCopied(false)
      setName('')
      await load()
    } catch (caught) {
      setError(errorMessage(caught, t))
    } finally {
      setBusy(false)
    }
  }

  async function revoke(key: AgentKey) {
    if (!window.confirm(fill(copy.revokeConfirm, { name: key.name }))) return
    setError(null)
    try {
      await api(`/admin/agent-keys/${key.id}`, { method: 'DELETE' })
      await load()
    } catch (caught) {
      setError(errorMessage(caught, t))
    }
  }

  return (
    <Card className="mt-8">
      <CardHeader title={copy.title} hint={copy.hint} />
      <div className="space-y-5 px-5 py-5">
        <form onSubmit={create} className="flex flex-wrap items-end gap-3">
          <TextField
            id="agent-key-name"
            label={copy.name}
            placeholder={copy.namePlaceholder}
            value={name}
            maxLength={80}
            onChange={(event) => setName(event.target.value)}
            className="min-w-64 flex-1"
          />
          <Button type="submit" variant="dark" loading={busy}>
            {copy.create}
          </Button>
        </form>

        {created ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4" data-testid="agent-key-created">
            <p className="text-sm text-emerald-900">{copy.created}</p>
            <div className="mt-3 flex items-center gap-2">
              <code className="min-w-0 flex-1 truncate rounded-md bg-white px-3 py-2 font-mono text-sm">{created}</code>
              <Button
                variant="outline"
                onClick={async () => {
                  await navigator.clipboard.writeText(created)
                  setCopied(true)
                }}
              >
                {copied ? <Check aria-hidden className="size-4" /> : <Copy aria-hidden className="size-4" />}
                {copied ? copy.copied : copy.copy}
              </Button>
            </div>
          </div>
        ) : null}

        {error ? <FormMessage tone="error">{error}</FormMessage> : null}
      </div>

      {keys === null ? null : keys.length === 0 ? (
        <Empty>{copy.none}</Empty>
      ) : (
        <ul className="divide-y divide-ink-900/10 border-t border-ink-900/10">
          {keys.map((key) => (
            <li key={key.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3.5 text-sm">
              <KeyRound aria-hidden className="size-4 text-ink-900/40" />
              <span className="font-medium">{key.name}</span>
              <code className="font-mono text-xs text-ink-900/60">{key.prefix}…</code>
              <span className="text-xs text-ink-900/60">
                {key.revokedAt ? copy.revoked : key.lastUsedAt ? fill(copy.lastUsed, { date: formatDate(key.lastUsedAt.slice(0, 10), locale, { day: 'numeric', month: 'short', year: 'numeric' }) }) : copy.neverUsed}
              </span>
              {key.revokedAt ? null : (
                <button type="button" onClick={() => void revoke(key)} className="ml-auto text-sm font-medium text-red-700 hover:underline">
                  {copy.revoke}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
