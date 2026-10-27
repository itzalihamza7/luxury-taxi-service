'use client'

import { ExternalLink, Pencil, Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { VehicleImage } from '@/components/art/VehicleArt'
import { Button } from '@/components/ui/Button'
import { FormMessage } from '@/components/ui/Field'
import { Link } from '@/components/ui/Link'
import { useI18n } from '@/i18n/client'
import { fill } from '@/i18n/config'
import type { ManageMessages } from '@/i18n/messages/manage'
import { api, errorMessage } from '@/lib/api'
import { formatMoney } from '@/lib/format'
import type { BodyType } from '@/lib/types'
import { blankVehicle, vehicleFields } from './definitions'
import { EntryForm, type Draft } from './EntryForm'
import { Lead } from './ui'

/** A vehicle as the console sees it: everything, including rates and hidden vehicles. */
interface AdminVehicle extends Draft {
  id: string
  slug: string
  name: string
  bodyType: BodyType
  passengers: number
  luggage: number
  zoneFareCents: number
  imageUrl: string | null
  sortOrder: number
  active: boolean
}

/** Add, edit, reorder, hide and remove vehicles, with their prices and photos. */
export function FleetManager({ m }: { m: ManageMessages }) {
  const { t, locale } = useI18n()
  const [vehicles, setVehicles] = useState<AdminVehicle[] | null>(null)
  /** The vehicle being edited, `new` for the add form, or nothing. */
  const [open, setOpen] = useState<string | null>(null)
  const [notice, setNotice] = useState<{ tone: 'error' | 'success'; text: string } | null>(null)
  const [reload, setReload] = useState(0)

  useEffect(() => {
    let active = true
    api<{ vehicles: AdminVehicle[] }>('/admin/vehicles')
      .then((result) => {
        if (active) setVehicles(result.vehicles)
      })
      .catch((caught: unknown) => {
        if (active) setNotice({ tone: 'error', text: errorMessage(caught, t) })
      })
    return () => {
      active = false
    }
  }, [reload, t])

  const finish = (text: string) => {
    setOpen(null)
    setNotice({ tone: 'success', text })
    setReload((count) => count + 1)
  }

  const save = async (draft: Draft, id?: string) => {
    // The id is not part of what is saved, and an empty address means "make one from the name".
    const body = { ...draft, id: undefined, slug: draft.slug ? draft.slug : undefined }
    await api(id ? `/admin/vehicles/${id}` : '/admin/vehicles', { method: id ? 'PUT' : 'POST', body })
    finish(m.saved)
  }

  const fields = vehicleFields(m, t)
  const nextPosition = (vehicles?.reduce((highest, vehicle) => Math.max(highest, vehicle.sortOrder), 0) ?? 0) + 10

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Lead>{m.fleet.lead}</Lead>
        {open !== 'new' ? (
          <Button variant="dark" onClick={() => setOpen('new')}>
            <Plus aria-hidden className="size-4" />
            {m.fleet.add}
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
          <EntryForm key="new" title={m.fleet.new} fields={fields} initial={blankVehicle(nextPosition)} m={m} onSave={(draft) => save(draft)} onCancel={() => setOpen(null)} />
        </div>
      ) : null}

      {vehicles === null ? (
        <p className="py-10 text-sm text-ink-900/60">{t.loading}</p>
      ) : vehicles.length === 0 && open !== 'new' ? (
        <p className="mt-5 rounded-md border border-dashed border-ink-900/20 px-6 py-12 text-center text-ink-900/60">{m.empty}</p>
      ) : (
        <ul className="mt-5 space-y-2.5">
          {vehicles.map((vehicle) => {
            if (open === vehicle.id) {
              return (
                <li key={vehicle.id}>
                  <EntryForm
                    key={vehicle.id}
                    title={vehicle.name}
                    fields={fields}
                    initial={vehicle}
                    m={m}
                    onSave={(draft) => save(draft, vehicle.id)}
                    onCancel={() => setOpen(null)}
                    onDelete={{
                      name: vehicle.name,
                      run: async () => {
                        await api(`/admin/vehicles/${vehicle.id}`, { method: 'DELETE' })
                        finish(m.deleted)
                      },
                    }}
                  />
                </li>
              )
            }
            return (
              <li key={vehicle.id} className={`flex items-center gap-4 rounded-xl border border-ink-900/10 bg-white p-3 pr-4 ${vehicle.active ? '' : 'opacity-70'}`}>
                <span className="w-10 shrink-0 text-center text-sm font-semibold text-ink-900/60 tabular-nums" title={m.position}>
                  {vehicle.sortOrder}
                </span>
                <VehicleImage bodyType={vehicle.bodyType} imageUrl={vehicle.imageUrl} name="" sizes="112px" className="hidden aspect-[16/10] w-28 shrink-0 rounded bg-ink-900/[0.03] text-ink-900/70 sm:block" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">
                    {vehicle.name}
                    {vehicle.active ? null : <span className="ml-3 rounded-full bg-ink-900/5 px-2.5 py-0.5 text-xs font-normal text-ink-900/60">{m.hidden}</span>}
                  </p>
                  <p className="truncate text-sm text-ink-900/60">
                    {fill(m.fleet.seats, { passengers: vehicle.passengers, luggage: vehicle.luggage })} · {fill(m.fleet.from, { price: formatMoney(vehicle.zoneFareCents, 'EUR', locale) })}
                  </p>
                </div>
                {vehicle.active ? (
                  <Link href={`/fleet/${vehicle.slug}`} target="_blank" aria-label={`${m.view}: ${vehicle.name}`} title={m.view} className="hidden rounded-full p-2 text-ink-900/60 hover:text-ink-900 sm:inline-flex">
                    <ExternalLink aria-hidden className="size-4" />
                  </Link>
                ) : null}
                <Button variant="outline" onClick={() => setOpen(vehicle.id)} aria-label={`${m.edit}: ${vehicle.name}`}>
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
