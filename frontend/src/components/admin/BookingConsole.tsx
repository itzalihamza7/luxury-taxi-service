'use client'

import { Check, Copy, ExternalLink, FileCheck2, MessageCircle, Pencil, Send } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { BookingDetails } from '@/components/booking/BookingDetails'
import { BookingHistory } from '@/components/booking/BookingHistory'
import { PlaceInput } from '@/components/booking/PlaceInput'
import { Button } from '@/components/ui/Button'
import { FormMessage, SelectField, TextareaField, TextField } from '@/components/ui/Field'
import { Link } from '@/components/ui/Link'
import { useI18n } from '@/i18n/client'
import { fill } from '@/i18n/config'
import type { AccountMessages } from '@/i18n/messages/account'
import type { BookingMessages } from '@/i18n/messages/booking'
import type { ManageMessages } from '@/i18n/messages/manage'
import { api, ApiError, errorMessage, fieldMessage } from '@/lib/api'
import { formatDateTime, formatMoney, zonedFormValues } from '@/lib/format'
import { useAppConfig } from '@/lib/hooks'
import type { AdminBooking, BookingPayment, BookingStatus, Place } from '@/lib/types'

/** The status changes the API allows from each state (cancelling has its own dialog). */
const NEXT_STEPS: Record<BookingStatus, { status: BookingStatus; action: keyof AccountMessages['admin']['actions'] }[]> = {
  pending: [{ status: 'confirmed', action: 'confirm' }],
  confirmed: [
    { status: 'in_progress', action: 'start' },
    { status: 'completed', action: 'complete' },
  ],
  in_progress: [{ status: 'completed', action: 'complete' }],
  completed: [],
  cancelled: [],
}

interface Props {
  reference: string
  a: AccountMessages['admin']
  b: BookingMessages
  m: ManageMessages
  /** The booking changed: the list updates its row. */
  onChanged: (booking: AdminBooking) => void
}

const euros = (cents: number | null) => (cents === null ? '' : String(cents / 100))
const toCents = (value: string) => (value.trim() === '' ? null : Math.round(Number(value.replace(',', '.')) * 100))
const asPlace = (place: { label: string; lat: number; lng: number } | null): Place | null => (place ? { id: 'booked', kind: 'address', label: place.label, sublabel: '', lat: place.lat, lng: place.lng } : null)

/**
 * One booking in the console: its guest code, the steps it can move to, its payments (with the
 * one-tap WhatsApp message) and its history. Every edit needs a note, which the customer reads.
 */
export function BookingConsole({ reference, a, b, m, onChanged }: Props) {
  const { t, locale } = useI18n()
  const config = useAppConfig()
  const k = m.booking
  const [booking, setBooking] = useState<AdminBooking | null>(null)
  const [editing, setEditing] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  /** The WhatsApp message for the payment just requested: one tap to send it. */
  const [whatsapp, setWhatsapp] = useState<string | null | undefined>(undefined)
  const cancelDialog = useRef<HTMLDialogElement>(null)
  const [cancelNote, setCancelNote] = useState('')

  useEffect(() => {
    let active = true
    api<{ booking: AdminBooking }>(`/admin/bookings/${reference}`)
      .then((result) => {
        if (active) setBooking(result.booking)
      })
      .catch((caught) => {
        if (active) setError(errorMessage(caught, t))
      })
    return () => {
      active = false
    }
  }, [reference, t])

  if (!booking) return error ? <FormMessage tone="error">{error}</FormMessage> : <p className="text-sm text-ink-900/60">{t.loading}</p>

  const changed = (updated: AdminBooking) => {
    setBooking(updated)
    onChanged(updated)
  }

  const run = async (key: string, action: () => Promise<void>) => {
    setBusy(key)
    setError(null)
    try {
      await action()
    } catch (caught) {
      setError(errorMessage(caught, t))
    } finally {
      setBusy(null)
    }
  }

  const patch = (body: Record<string, unknown>) =>
    run('status', async () => {
      changed((await api<{ booking: AdminBooking }>(`/admin/bookings/${booking.reference}`, { method: 'PATCH', body })).booking)
    })

  const paymentAction = (payment: BookingPayment, action: 'paid' | 'cancel') =>
    run(payment.id, async () => {
      if (action === 'cancel' && !window.confirm(k.withdrawConfirm)) return
      changed((await api<{ booking: AdminBooking }>(`/admin/bookings/${booking.reference}/payments/${payment.id}/${action}`, { method: 'POST' })).booking)
    })

  const copyCode = async () => {
    await navigator.clipboard?.writeText(booking.guestCode ?? '').catch(() => undefined)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 2000)
  }

  const open = booking.status !== 'cancelled' && booking.status !== 'completed'
  const paidCents = (booking.payments ?? []).filter((payment) => payment.status === 'paid').reduce((sum, payment) => sum + payment.amountCents, 0)
  const outstanding = booking.totalCents === null ? null : Math.max(0, booking.totalCents - paidCents)

  return (
    <div className="space-y-8">
      {error ? <FormMessage tone="error">{error}</FormMessage> : null}

      {/* Guest code and the way to the customer's page */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-md bg-slate-50 p-4">
        {booking.guestCode ? (
          <div>
            <p className="text-xs font-semibold tracking-wide text-ink-900/55 uppercase">{k.guestCode}</p>
            <p className="mt-1 flex items-center gap-3">
              <span className="font-mono text-xl font-semibold tracking-[0.2em]">{booking.guestCode}</span>
              <button type="button" onClick={() => void copyCode()} className="inline-flex items-center gap-1 text-xs font-medium text-ink-900/60 hover:text-ink-900">
                {copied ? <Check aria-hidden className="size-3.5" /> : <Copy aria-hidden className="size-3.5" />}
                {copied ? k.copied : k.copy}
              </button>
            </p>
            <p className="mt-1 text-xs text-ink-900/55">{k.guestCodeHint}</p>
          </div>
        ) : (
          <span />
        )}
        <Link href={`/booking/${booking.reference}`} target="_blank" className="inline-flex items-center gap-1.5 text-sm font-medium underline-offset-4 hover:underline">
          {k.openPage}
          <ExternalLink aria-hidden className="size-3.5" />
        </Link>
      </div>

      {/* Moving it along */}
      <div className="flex flex-wrap gap-2.5">
        {NEXT_STEPS[booking.status].map((step) => (
          <Button key={step.status} variant="dark" loading={busy === 'status'} disabled={busy !== null} onClick={() => void patch({ status: step.status })}>
            {a.actions[step.action]}
          </Button>
        ))}
        {/* For money taken without a payment link, e.g. paid to the chauffeur on the day. */}
        <Button variant="outline" disabled={busy !== null} onClick={() => void patch({ paymentStatus: booking.paymentStatus === 'paid' ? 'unpaid' : 'paid' })}>
          {booking.paymentStatus === 'paid' ? a.actions.markUnpaid : a.actions.markPaid}
        </Button>
        {open ? (
          <Button variant="outline" disabled={busy !== null} onClick={() => setEditing(!editing)}>
            <Pencil aria-hidden className="size-4" />
            {k.edit}
          </Button>
        ) : null}
        {open ? (
          <button type="button" disabled={busy !== null} onClick={() => cancelDialog.current?.showModal()} className="ml-auto px-3 text-sm font-medium text-red-700 underline-offset-4 hover:underline disabled:opacity-50">
            {a.actions.cancel}
          </button>
        ) : null}
      </div>

      {editing ? (
        <EditForm
          booking={booking}
          m={m}
          b={b}
          onSaved={(updated) => {
            changed(updated)
            setEditing(false)
          }}
          onClose={() => setEditing(false)}
        />
      ) : null}

      {/* Payments */}
      <section>
        <h3 className="text-sm font-semibold">{k.payments}</h3>
        {(booking.payments ?? []).length === 0 ? (
          <p className="mt-2 text-sm text-ink-900/60">{k.noPayments}</p>
        ) : (
          <ul className="mt-3 divide-y divide-ink-900/10 rounded-md border border-ink-900/10">
            {(booking.payments ?? []).map((payment) => (
              <li key={payment.id} className="flex flex-wrap items-center gap-x-5 gap-y-2 p-4 text-sm">
                <span className="min-w-0 flex-1">
                  <span className="font-semibold">
                    {k.kinds[payment.kind]} · {formatMoney(payment.amountCents, payment.currency, locale)}
                  </span>
                  <span className={`ml-2 rounded-full px-2 py-0.5 text-xs font-semibold ${payment.status === 'paid' ? 'bg-emerald-100 text-emerald-900' : payment.status === 'requested' ? 'bg-amber-100 text-amber-900' : 'bg-ink-900/10 text-ink-900/60'}`}>
                    {k.statuses[payment.status]}
                  </span>
                  <span className="mt-1 block truncate text-xs text-ink-900/55">
                    {formatDateTime(payment.paidAt ?? payment.requestedAt, locale, config.timeZone)} · {payment.link}
                  </span>
                  {payment.status === 'requested' && payment.proofUploadedAt && payment.proofUrl ? (
                    <span className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-900">
                      {fill(k.proofReceived, { date: formatDateTime(payment.proofUploadedAt, locale, config.timeZone) })}
                      <a href={payment.proofUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold underline underline-offset-4">
                        <FileCheck2 aria-hidden className="size-3.5" />
                        {k.viewProof}
                      </a>
                    </span>
                  ) : null}
                </span>
                {payment.status === 'requested' ? (
                  <span className="flex flex-wrap items-center gap-2">
                    {payment.whatsappUrl ? (
                      <a href={payment.whatsappUrl} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center gap-1.5 rounded-full bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-700">
                        <MessageCircle aria-hidden className="size-4" />
                        {k.whatsapp}
                      </a>
                    ) : null}
                    <Button variant="outline" loading={busy === payment.id} disabled={busy !== null} onClick={() => void paymentAction(payment, 'paid')}>
                      {k.markPaid}
                    </Button>
                    <button type="button" disabled={busy !== null} onClick={() => void paymentAction(payment, 'cancel')} className="px-2 text-sm text-ink-900/60 underline-offset-4 hover:text-ink-900 hover:underline">
                      {k.withdraw}
                    </button>
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
        {outstanding !== null && paidCents > 0 && outstanding > 0 ? <p className="mt-2 text-sm text-ink-900/65">{fill(k.outstanding, { amount: formatMoney(outstanding, booking.currency, locale) })}</p> : null}

        {open ? (
          booking.totalCents === null ? (
            <p className="mt-4 rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-900">{k.setPriceFirst}</p>
          ) : (
            <PaymentRequest
              booking={booking}
              outstanding={outstanding ?? 0}
              m={m}
              onRequested={(updated, url) => {
                changed(updated)
                setWhatsapp(url)
              }}
            />
          )
        ) : null}
        {whatsapp !== undefined ? (
          <div className="mt-4 flex flex-wrap items-center gap-3 rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
            {whatsapp ? (
              <>
                <span>{k.sent}</span>
                <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center gap-1.5 rounded-full bg-emerald-600 px-4 font-semibold text-white hover:bg-emerald-700">
                  <MessageCircle aria-hidden className="size-4" />
                  {k.whatsapp}
                </a>
              </>
            ) : (
              <span>{k.noWhatsapp}</span>
            )}
          </div>
        ) : null}
      </section>

      {booking.events && booking.events.length > 0 ? <BookingHistory events={booking.events} b={b} timeZone={config.timeZone} currency={booking.currency} /> : null}

      <div className="max-w-3xl border-t border-ink-900/10 pt-6">
        <BookingDetails booking={{ ...booking, events: undefined, payments: undefined }} b={b} timeZone={config.timeZone} hideCancel />
      </div>

      <dialog ref={cancelDialog} aria-labelledby={`cancel-${booking.reference}`} className="m-auto w-[min(30rem,calc(100vw-2rem))] rounded-lg bg-bone-50 p-0 text-ink-900 shadow-2xl backdrop:bg-ink-950/70">
        <form
          method="dialog"
          className="space-y-4 p-6"
          onSubmit={(event) => {
            event.preventDefault()
            void patch({ status: 'cancelled', note: cancelNote.trim() }).then(() => {
              cancelDialog.current?.close()
              setCancelNote('')
            })
          }}
        >
          <h2 id={`cancel-${booking.reference}`} className="display text-2xl">
            {k.cancelTitle}
          </h2>
          <p className="text-sm text-ink-900/65">{k.cancelLead}</p>
          <TextareaField id={`cancel-note-${booking.reference}`} label={k.cancelNote} rows={3} value={cancelNote} onChange={(event) => setCancelNote(event.target.value)} required />
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => cancelDialog.current?.close()}>
              {k.keep}
            </Button>
            <Button type="submit" variant="dark" loading={busy === 'status'} disabled={cancelNote.trim().length < 3}>
              {k.cancelConfirm}
            </Button>
          </div>
        </form>
      </dialog>
    </div>
  )
}

/** Asks for an advance, the full amount or the balance through the business's payment link. */
function PaymentRequest({ booking, outstanding, m, onRequested }: { booking: AdminBooking; outstanding: number; m: ManageMessages; onRequested: (booking: AdminBooking, whatsappUrl: string | null) => void }) {
  const { t } = useI18n()
  const k = m.booking
  const partlyPaid = booking.paymentStatus === 'partly_paid'
  const [form, setForm] = useState<{ kind: BookingPayment['kind']; amount: string; link: string }>(() => ({ kind: partlyPaid ? 'balance' : 'advance', amount: partlyPaid ? euros(outstanding) : '', link: '' }))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const setKind = (kind: BookingPayment['kind']) => setForm((current) => ({ ...current, kind, amount: kind === 'advance' ? current.amount : euros(outstanding) }))

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setErrors({})
    setError(null)
    try {
      const result = await api<{ booking: AdminBooking; whatsappUrl: string | null }>(`/admin/bookings/${booking.reference}/payments`, {
        method: 'POST',
        body: { kind: form.kind, amountCents: toCents(form.amount) ?? 0, link: form.link.trim() },
      })
      onRequested(result.booking, result.whatsappUrl)
      setForm({ kind: 'balance', amount: '', link: '' })
    } catch (caught) {
      if (caught instanceof ApiError && caught.code === 'VALIDATION') setErrors(caught.fields)
      else setError(errorMessage(caught, t))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} noValidate className="mt-5 space-y-4 rounded-md border border-ink-900/10 p-4 sm:p-5">
      <p className="text-sm font-semibold">{k.request}</p>
      <div className="grid gap-4 sm:grid-cols-[12rem_10rem_minmax(0,1fr)]">
        <SelectField id={`pay-kind-${booking.reference}`} label={k.kind} value={form.kind} onChange={(event) => setKind(event.target.value as BookingPayment['kind'])}>
          {(['advance', 'full', 'balance'] as const).map((kind) => (
            <option key={kind} value={kind}>
              {k.kinds[kind]}
            </option>
          ))}
        </SelectField>
        <TextField id={`pay-amount-${booking.reference}`} label={k.amount} inputMode="decimal" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} error={fieldMessage(errors.amountCents, t)} />
        <TextField id={`pay-link-${booking.reference}`} label={k.link} hint={k.linkHint} inputMode="url" placeholder="https://" value={form.link} onChange={(event) => setForm({ ...form, link: event.target.value })} error={fieldMessage(errors.link, t)} />
      </div>
      {error ? <FormMessage tone="error">{error}</FormMessage> : null}
      <Button type="submit" variant="dark" loading={busy} disabled={!form.amount.trim() || !form.link.trim()}>
        <Send aria-hidden className="size-4" />
        {k.send}
      </Button>
    </form>
  )
}

/** Edits a booking. Fields left as they are stay unchanged; the note says why. */
function EditForm({ booking, m, b, onSaved, onClose }: { booking: AdminBooking; m: ManageMessages; b: BookingMessages; onSaved: (booking: AdminBooking) => void; onClose: () => void }) {
  const { t } = useI18n()
  const config = useAppConfig()
  const k = m.booking
  const pickup = zonedFormValues(new Date(booking.pickupAt).getTime(), config.timeZone)
  const back = booking.returnAt ? zonedFormValues(new Date(booking.returnAt).getTime(), config.timeZone) : { date: '', time: '' }
  const [vehicles, setVehicles] = useState<{ id: string; name: string; active: boolean }[]>([])
  const [form, setForm] = useState(() => ({
    date: pickup.date,
    time: pickup.time,
    returnDate: back.date,
    returnTime: back.time,
    hours: booking.hours ? String(booking.hours) : '',
    pickup: asPlace(booking.pickup),
    dropoff: asPlace(booking.dropoff),
    vehicleName: booking.vehicleName,
    vehicleId: '',
    price: euros(booking.totalCents),
    adults: String(booking.adults),
    children: String(booking.children),
    luggage: String(booking.luggage),
    flight: booking.flightNumber ?? '',
    name: booking.contact.name,
    email: booking.contact.email ?? '',
    phone: booking.contact.phone ?? '',
    company: booking.contact.company ?? '',
    notes: booking.contact.notes ?? '',
    note: '',
  }))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const set = (field: keyof typeof form) => (event: { target: { value: string } }) => setForm({ ...form, [field]: event.target.value })

  useEffect(() => {
    api<{ vehicles: { id: string; name: string; active: boolean }[] }>('/admin/vehicles')
      .then((result) => setVehicles(result.vehicles))
      .catch(() => setVehicles([]))
  }, [])
  const currentVehicleId = form.vehicleId || vehicles.find((vehicle) => vehicle.name === form.vehicleName)?.id || ''

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (form.note.trim().length < 3) {
      setErrors({ note: 'required' })
      return
    }
    setBusy(true)
    setErrors({})
    setError(null)
    try {
      const body: Record<string, unknown> = {
        note: form.note.trim(),
        pickupDate: form.date,
        pickupTime: form.time,
        pickup: form.pickup ? { label: form.pickup.label, lat: form.pickup.lat, lng: form.pickup.lng } : undefined,
        totalCents: toCents(form.price),
        adults: Number(form.adults),
        children: Number(form.children),
        luggage: Number(form.luggage),
        flightNumber: form.flight,
        contact: { name: form.name, email: form.email, phone: form.phone, company: form.company, notes: form.notes },
      }
      if (booking.rideType !== 'hourly') body.dropoff = form.dropoff ? { label: form.dropoff.label, lat: form.dropoff.lat, lng: form.dropoff.lng } : null
      if (booking.rideType === 'hourly') body.hours = Number(form.hours)
      if (booking.rideType === 'return') {
        body.returnDate = form.returnDate
        body.returnTime = form.returnTime
      }
      if (form.vehicleId) body.vehicleId = form.vehicleId
      onSaved((await api<{ booking: AdminBooking }>(`/admin/bookings/${booking.reference}`, { method: 'PUT', body })).booking)
    } catch (caught) {
      if (caught instanceof ApiError && caught.code === 'VALIDATION') setErrors(caught.fields)
      else setError(errorMessage(caught, t))
    } finally {
      setBusy(false)
    }
  }

  const id = (field: string) => `edit-${field}-${booking.reference}`
  return (
    <form onSubmit={submit} noValidate className="space-y-5 rounded-md border border-gold-600/30 bg-gold-100/30 p-4 sm:p-6">
      <p className="text-sm text-ink-900/70">{k.editLead}</p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <TextField id={id('date')} type="date" label={k.date} value={form.date} onChange={set('date')} error={fieldMessage(errors.pickupDate, t)} />
        <TextField id={id('time')} type="time" label={k.time} value={form.time} onChange={set('time')} error={fieldMessage(errors.pickupTime, t)} />
        {booking.rideType === 'return' ? (
          <>
            <TextField id={id('return-date')} type="date" label={k.returnDate} value={form.returnDate} onChange={set('returnDate')} error={fieldMessage(errors.returnDate, t)} />
            <TextField id={id('return-time')} type="time" label={k.returnTime} value={form.returnTime} onChange={set('returnTime')} error={fieldMessage(errors.returnTime, t)} />
          </>
        ) : null}
        {booking.rideType === 'hourly' ? <TextField id={id('hours')} type="number" min={1} max={24} label={k.hours} value={form.hours} onChange={set('hours')} error={fieldMessage(errors.hours, t)} /> : null}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <PlaceInput id={id('pickup')} label={k.pickup} value={form.pickup} onChange={(place) => setForm({ ...form, pickup: place })} t={b.ride} error={fieldMessage(errors.pickup, t)} />
        {booking.rideType === 'hourly' ? null : <PlaceInput id={id('dropoff')} label={k.dropoff} value={form.dropoff} onChange={(place) => setForm({ ...form, dropoff: place })} t={b.ride} error={fieldMessage(errors.dropoff, t)} />}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <SelectField id={id('vehicle')} label={k.vehicle} value={currentVehicleId} onChange={(event) => setForm({ ...form, vehicleId: event.target.value })} className="lg:col-span-2">
          {currentVehicleId ? null : <option value="">{booking.vehicleName}</option>}
          {vehicles.map((vehicle) => (
            <option key={vehicle.id} value={vehicle.id}>
              {vehicle.name}
            </option>
          ))}
        </SelectField>
        <TextField id={id('price')} label={k.price} hint={k.priceHint} inputMode="decimal" value={form.price} onChange={set('price')} error={fieldMessage(errors.totalCents, t)} />
        <TextField id={id('flight')} label={k.flight} value={form.flight} onChange={set('flight')} error={fieldMessage(errors.flightNumber, t)} className="lg:col-span-2" />
      </div>
      <div className="grid grid-cols-3 gap-4 sm:max-w-md">
        <TextField id={id('adults')} type="number" min={1} max={16} label={k.adults} value={form.adults} onChange={set('adults')} error={fieldMessage(errors.adults, t)} />
        <TextField id={id('children')} type="number" min={0} max={16} label={k.children} value={form.children} onChange={set('children')} error={fieldMessage(errors.children, t)} />
        <TextField id={id('luggage')} type="number" min={0} max={16} label={k.luggage} value={form.luggage} onChange={set('luggage')} error={fieldMessage(errors.luggage, t)} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <TextField id={id('name')} label={k.name} value={form.name} onChange={set('name')} error={fieldMessage(errors['contact.name'], t)} />
        <TextField id={id('email')} type="email" label={k.email} value={form.email} onChange={set('email')} error={fieldMessage(errors['contact.email'] ?? errors.email, t)} />
        <TextField id={id('phone')} type="tel" label={k.phone} value={form.phone} onChange={set('phone')} error={fieldMessage(errors['contact.phone'], t)} />
        <TextField id={id('company')} label={k.company} value={form.company} onChange={set('company')} />
      </div>
      <TextareaField id={id('notes')} label={k.notes} rows={2} value={form.notes} onChange={set('notes')} />
      <TextareaField id={id('note')} label={k.note} hint={k.noteHint} rows={3} value={form.note} onChange={set('note')} error={fieldMessage(errors.note, t)} required />
      {error ? <FormMessage tone="error">{error}</FormMessage> : null}
      <div className="flex flex-wrap gap-3">
        <Button type="submit" variant="dark" loading={busy}>
          {k.save}
        </Button>
        <Button type="button" variant="outline" onClick={onClose}>
          {k.close}
        </Button>
      </div>
    </form>
  )
}
