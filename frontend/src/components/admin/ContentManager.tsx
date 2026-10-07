'use client'

import { ExternalLink, Pencil, Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { FormMessage } from '@/components/ui/Field'
import { Link } from '@/components/ui/Link'
import { useI18n } from '@/i18n/client'
import type { ManageMessages } from '@/i18n/messages/manage'
import { api, errorMessage } from '@/lib/api'
import type { Collection } from '@/lib/types'
import { blankEntry, contentFields, entryDetail, entryTitle, PAGE_PATHS, type Choices } from './definitions'
import { EntryForm, type Draft } from './EntryForm'

interface AdminEntry {
  id: string
  slug: string
  sortOrder: number
  published: boolean
  data: Draft
}

const COLLECTIONS: Collection[] = ['service', 'route', 'event', 'article', 'faq', 'review', 'legal']

/** Add, edit, reorder and remove the website's content, one kind at a time. */
export function ContentManager({ m }: { m: ManageMessages }) {
  const { t, locale } = useI18n()
  const [collection, setCollection] = useState<Collection>('service')
  const [entries, setEntries] = useState<AdminEntry[] | null>(null)
  /** The entry being edited, `new` for the add form, or nothing. */
  const [open, setOpen] = useState<string | null>(null)
  const [choices, setChoices] = useState<Choices>({ vehicles: [], places: [] })
  const [notice, setNotice] = useState<{ tone: 'error' | 'success'; text: string } | null>(null)
  const [reload, setReload] = useState(0)

  // What the forms let the operator choose from: the fleet, and the places the booking form knows.
  useEffect(() => {
    let active = true
    Promise.all([api<{ vehicles: { slug: string; name: string }[] }>('/admin/vehicles'), api<{ places: { id: string; name: Record<string, string> }[] }>('/admin/places')])
      .then(([fleet, catalogue]) => {
        if (!active) return
        setChoices({
          vehicles: fleet.vehicles.map((vehicle) => ({ value: vehicle.slug, label: vehicle.name })),
          places: catalogue.places.map((place) => ({ value: place.id, label: place.name[locale] ?? place.id })),
        })
      })
      .catch(() => undefined)
    return () => {
      active = false
    }
  }, [locale])

  useEffect(() => {
    let active = true
    api<{ entries: AdminEntry[] }>(`/admin/content/${collection}`)
      .then((result) => {
        if (active) setEntries(result.entries)
      })
      .catch((caught: unknown) => {
        if (active) setNotice({ tone: 'error', text: errorMessage(caught, t) })
      })
    return () => {
      active = false
    }
  }, [collection, reload, t])

  const choose = (next: Collection) => {
    setCollection(next)
    setEntries(null)
    setOpen(null)
    setNotice(null)
  }

  const finish = (text: string) => {
    setOpen(null)
    setNotice({ tone: 'success', text })
    setReload((count) => count + 1)
  }

  const save = async (draft: Draft, id?: string) => {
    // An empty address means "make one from the title".
    const body = { ...draft, slug: draft.slug ? draft.slug : undefined }
    await api(id ? `/admin/content/${collection}/${id}` : `/admin/content/${collection}`, { method: id ? 'PUT' : 'POST', body })
    finish(m.saved)
  }

  const fields = contentFields(collection, m, t, choices)
  const nextPosition = (entries?.reduce((highest, entry) => Math.max(highest, entry.sortOrder), 0) ?? 0) + 10
  const pagePath = PAGE_PATHS[collection]

  return (
    <div className="mt-6">
      <p className="max-w-3xl text-sm leading-relaxed text-ink-900/65">{m.content.lead}</p>

      <div role="tablist" aria-label={m.tabs.content} className="mt-5 flex flex-wrap gap-2">
        {COLLECTIONS.map((id) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={collection === id}
            onClick={() => choose(id)}
            className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${collection === id ? 'border-ink-950 bg-ink-950 text-bone-50' : 'border-ink-900/15 bg-white text-ink-900/70 hover:border-ink-900/40 hover:text-ink-900'}`}
          >
            {m.content.collections[id]}
          </button>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-ink-900/60">{m.content.notes[collection]}</p>
        {open !== 'new' ? (
          <Button variant="dark" onClick={() => setOpen('new')}>
            <Plus aria-hidden className="size-4" />
            {m.content.add[collection]}
          </Button>
        ) : null}
      </div>

      {notice ? (
        <div className="mt-5">
          <FormMessage tone={notice.tone}>{notice.text}</FormMessage>
        </div>
      ) : null}

      {open === 'new' ? (
        <div className="mt-5">
          <EntryForm key={`new-${collection}`} title={m.content.new[collection]} fields={fields} initial={blankEntry(collection, nextPosition)} m={m} onSave={(draft) => save(draft)} onCancel={() => setOpen(null)} />
        </div>
      ) : null}

      {entries === null ? (
        <p className="py-10 text-sm text-ink-900/60">{t.loading}</p>
      ) : entries.length === 0 && open !== 'new' ? (
        <p className="mt-5 rounded-md border border-dashed border-ink-900/20 px-6 py-12 text-center text-ink-900/60">{m.empty}</p>
      ) : (
        <ul className="mt-5 space-y-2.5">
          {entries.map((entry) => {
            const name = entryTitle(collection, entry.data, locale)
            if (open === entry.id) {
              return (
                <li key={entry.id}>
                  <EntryForm
                    key={entry.id}
                    title={name}
                    fields={fields}
                    initial={{ slug: entry.slug, sortOrder: entry.sortOrder, published: entry.published, data: entry.data }}
                    m={m}
                    onSave={(draft) => save(draft, entry.id)}
                    onCancel={() => setOpen(null)}
                    onDelete={{
                      name,
                      run: async () => {
                        await api(`/admin/content/${collection}/${entry.id}`, { method: 'DELETE' })
                        finish(m.deleted)
                      },
                    }}
                  />
                </li>
              )
            }
            return (
              <li key={entry.id} className="flex items-center gap-4 rounded-md border border-ink-900/10 bg-white p-4">
                <span className="w-10 shrink-0 text-center font-display text-xl text-ink-900/60" title={m.position}>
                  {entry.sortOrder}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">
                    {name}
                    {entry.published ? null : <span className="ml-3 rounded-full bg-ink-900/5 px-2.5 py-0.5 text-xs font-normal text-ink-900/60">{m.hidden}</span>}
                  </p>
                  <p className="truncate text-sm text-ink-900/60">{entryDetail(collection, entry.data, locale)}</p>
                </div>
                {pagePath && entry.published ? (
                  <Link href={`${pagePath}/${entry.slug}`} target="_blank" aria-label={`${m.view}: ${name}`} title={m.view} className="hidden rounded-full p-2 text-ink-900/60 hover:text-ink-900 sm:inline-flex">
                    <ExternalLink aria-hidden className="size-4" />
                  </Link>
                ) : null}
                <Button variant="outline" onClick={() => setOpen(entry.id)} aria-label={`${m.edit}: ${name}`}>
                  <Pencil aria-hidden className="size-3.5" />
                  {m.edit}
                </Button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
