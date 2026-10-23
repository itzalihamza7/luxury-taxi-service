'use client'

import { Lock, Pencil, Search, ShieldAlert, Trash2, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { useAuth } from '@/components/auth/AuthProvider'
import { Button } from '@/components/ui/Button'
import { controlClass, FormMessage, SelectField, TextField } from '@/components/ui/Field'
import { useI18n } from '@/i18n/client'
import { fill } from '@/i18n/config'
import type { AccountMessages } from '@/i18n/messages/account'
import type { ManageMessages } from '@/i18n/messages/manage'
import { api, ApiError, errorMessage, fieldMessage } from '@/lib/api'
import { formatDate } from '@/lib/format'
import type { UserRole } from '@/lib/types'
import { Card, Empty, Lead } from './ui'

interface Account {
  id: string
  name: string
  email: string
  phone: string | null
  role: UserRole
  bookings: number
  createdAt: string
}

interface Result {
  users: Account[]
  total: number
  roles: Partial<Record<UserRole, number>>
}

type M = ManageMessages['users']

const ROLES: UserRole[] = ['customer', 'admin', 'superadmin']
const PAGE_SIZE = 25

const ROLE_STYLES: Record<UserRole, string> = {
  customer: 'bg-slate-100 text-ink-900/70',
  admin: 'bg-sky-100 text-sky-900',
  superadmin: 'bg-amber-100 text-amber-900',
}

function RoleBadge({ role, m }: { role: UserRole; m: M }) {
  return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${ROLE_STYLES[role]}`}>{m.roles[role]}</span>
}

/** A modal that asks again before something critical happens. */
function Confirm({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const { t } = useI18n()
  // Opened once it is in the page. It is not closed on unmount: removing it closes it, and closing
  // it here would report a close to the parent while React re-runs effects in development.
  useEffect(() => {
    if (dialog.current && !dialog.current.open) dialog.current.showModal()
  }, [])
  return (
    <dialog ref={dialog} onClose={onClose} aria-labelledby="confirm-title" className="m-auto w-[min(30rem,calc(100vw-2rem))] rounded-xl bg-white p-0 text-ink-900 shadow-2xl backdrop:bg-ink-950/60 backdrop:backdrop-blur-sm">
      <div className="p-6">
        <div className="flex items-start justify-between gap-4">
          <h2 id="confirm-title" className="flex items-start gap-2.5 text-lg font-semibold tracking-tight">
            <ShieldAlert aria-hidden className="mt-0.5 size-5 shrink-0 text-amber-600" />
            {title}
          </h2>
          <button type="button" onClick={onClose} aria-label={t.actions.close} className="rounded-full p-1 text-ink-900/60 hover:text-ink-900">
            <X aria-hidden className="size-5" />
          </button>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </dialog>
  )
}

interface Pending {
  kind: 'role' | 'email' | 'delete'
  account: Account
  changes?: Partial<Pick<Account, 'name' | 'email' | 'phone' | 'role'>>
}

/** The password, and for deletions the typed email, then the request itself. */
function ConfirmCritical({ pending, m, onDone, onClose }: { pending: Pending; m: M; onDone: (message: string) => void; onClose: () => void }) {
  const { t } = useI18n()
  const c = m.confirm
  const { account, kind, changes } = pending
  const [password, setPassword] = useState('')
  const [typed, setTyped] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const typedMatches = typed.trim().toLowerCase() === account.email
  const ready = password.length > 0 && (kind !== 'delete' || typedMatches)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!ready) return
    setBusy(true)
    setError(null)
    setErrors({})
    try {
      if (kind === 'delete') {
        await api(`/admin/users/${account.id}`, { method: 'DELETE', body: { confirmEmail: typed, password } })
        onDone(fill(m.deleted, { email: account.email }))
      } else {
        await api(`/admin/users/${account.id}`, { method: 'PATCH', body: { ...changes, password } })
        onDone(m.saved)
      }
    } catch (caught) {
      setBusy(false)
      if (caught instanceof ApiError && Object.keys(caught.fields).length > 0) setErrors(caught.fields)
      else setError(errorMessage(caught, t))
    }
  }

  const title = kind === 'delete' ? c.deleteTitle : kind === 'role' ? c.roleTitle : c.emailTitle
  return (
    <Confirm title={fill(title, { name: account.name })} onClose={onClose}>
      <form onSubmit={submit} noValidate className="space-y-4">
        {kind === 'role' && changes?.role ? (
          <>
            <p className="text-sm leading-relaxed text-ink-900/70">{fill(c.roleText, { from: m.roles[account.role], to: m.roles[changes.role] })}</p>
            {changes.role === 'superadmin' ? <FormMessage tone="error">{c.superText}</FormMessage> : null}
          </>
        ) : null}
        {kind === 'email' && changes?.email ? <p className="text-sm leading-relaxed text-ink-900/70">{fill(c.emailText, { email: changes.email })}</p> : null}
        {kind === 'delete' ? (
          <>
            <p className="text-sm leading-relaxed text-ink-900/70">{c.deleteText}</p>
            <TextField
              id="confirm-email"
              label={fill(c.typeEmail, { email: account.email })}
              autoComplete="off"
              spellCheck={false}
              autoCapitalize="none"
              value={typed}
              onChange={(event) => setTyped(event.target.value)}
              error={fieldMessage(errors.confirmEmail, t)}
            />
          </>
        ) : null}
        <TextField
          id="confirm-password"
          type="password"
          label={c.password}
          hint={c.passwordHint}
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          error={fieldMessage(errors.password, t) ?? fieldMessage(errors.email, t)}
        />
        {error ? <FormMessage tone="error">{error}</FormMessage> : null}
        <div className="flex flex-wrap justify-end gap-3 pt-2">
          <Button variant="outline" onClick={onClose}>
            {m.cancel}
          </Button>
          <Button type="submit" variant="dark" loading={busy} disabled={!ready} className={kind === 'delete' ? 'bg-red-700 hover:bg-red-800' : ''} data-testid="confirm-critical">
            {kind === 'delete' ? c.deleteButton : kind === 'role' ? c.apply : c.applyEmail}
          </Button>
        </div>
      </form>
    </Confirm>
  )
}

/** Name, email, phone and role of one account. Critical changes go through `ConfirmCritical`. */
function EditAccount({ account, m, actorRole, isSelf, onSaved, onCritical, onCancel }: { account: Account; m: M; actorRole: UserRole; isSelf: boolean; onSaved: (message: string) => void; onCritical: (pending: Pending) => void; onCancel: () => void }) {
  const { t } = useI18n()
  const [form, setForm] = useState({ name: account.name, email: account.email, phone: account.phone ?? '', role: account.role })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  // Only a super admin may give out, or take away, the super admin role.
  const roles = ROLES.filter((role) => role !== 'superadmin' || actorRole === 'superadmin')

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const changes = { name: form.name, email: form.email.trim().toLowerCase(), phone: form.phone, role: form.role }
    if (changes.role !== account.role) return onCritical({ kind: 'role', account, changes })
    if (changes.email !== account.email) return onCritical({ kind: 'email', account, changes })
    setBusy(true)
    setError(null)
    setErrors({})
    try {
      await api(`/admin/users/${account.id}`, { method: 'PATCH', body: { name: changes.name, phone: changes.phone } })
      onSaved(m.saved)
    } catch (caught) {
      setBusy(false)
      if (caught instanceof ApiError && caught.code === 'VALIDATION') setErrors(caught.fields)
      else setError(errorMessage(caught, t))
    }
  }

  return (
    <form onSubmit={submit} noValidate className="grid gap-4 border-t border-ink-900/10 bg-slate-50 p-5 sm:grid-cols-2">
      <TextField id={`name-${account.id}`} label={m.name} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} error={fieldMessage(errors.name, t)} />
      <TextField id={`email-${account.id}`} type="email" label={m.email} value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} error={fieldMessage(errors.email, t)} />
      <TextField id={`phone-${account.id}`} type="tel" label={m.phone} value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} error={fieldMessage(errors.phone, t)} />
      <SelectField id={`role-${account.id}`} label={m.role} value={form.role} disabled={isSelf} hint={isSelf ? m.ownRole : m.roleHints[form.role]} onChange={(event) => setForm({ ...form, role: event.target.value as UserRole })}>
        {roles.map((role) => (
          <option key={role} value={role}>
            {m.roles[role]}
          </option>
        ))}
      </SelectField>
      {error ? (
        <div className="sm:col-span-2">
          <FormMessage tone="error">{error}</FormMessage>
        </div>
      ) : null}
      <div className="flex flex-wrap gap-3 sm:col-span-2">
        <Button type="submit" variant="dark" loading={busy}>
          {m.save}
        </Button>
        <Button variant="outline" onClick={onCancel}>
          {m.cancel}
        </Button>
      </div>
    </form>
  )
}

/** Every account: search, filter by role, edit and delete, within the rules the API enforces. */
export function UsersManager({ a, m }: { a: AccountMessages['admin']; m: ManageMessages }) {
  const { t, locale } = useI18n()
  const { user } = useAuth()
  const u = m.users
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  const [role, setRole] = useState<UserRole | ''>('')
  const [page, setPage] = useState(1)
  const [result, setResult] = useState<Result | null>(null)
  const [open, setOpen] = useState<string | null>(null)
  const [pending, setPending] = useState<Pending | null>(null)
  const [notice, setNotice] = useState<{ tone: 'error' | 'success'; text: string } | null>(null)
  const [reload, setReload] = useState(0)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setQuery(search.trim())
      setPage(1)
    }, 300)
    return () => window.clearTimeout(timer)
  }, [search])

  useEffect(() => {
    let active = true
    const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) })
    if (query) params.set('q', query)
    if (role) params.set('role', role)
    api<Result>(`/admin/users?${params}`)
      .then((loaded) => {
        if (active) setResult(loaded)
      })
      .catch((caught: unknown) => {
        if (active) setNotice({ tone: 'error', text: errorMessage(caught, t) })
      })
    return () => {
      active = false
    }
  }, [query, role, page, reload, t])

  const done = useCallback((text: string) => {
    setPending(null)
    setOpen(null)
    setNotice({ tone: 'success', text })
    setReload((count) => count + 1)
  }, [])

  if (!user) return null
  const actorRole = user.role
  const pages = result ? Math.max(1, Math.ceil(result.total / PAGE_SIZE)) : 1
  const allCount = result ? Object.values(result.roles).reduce((sum, value) => sum + (value ?? 0), 0) : undefined
  const head = 'text-xs font-semibold tracking-wide text-ink-900/55 uppercase'
  const columns = 'lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_8.5rem_5.5rem_7rem_11rem] lg:items-center lg:gap-x-4'

  return (
    <div className="space-y-4">
      <Lead>{u.lead}</Lead>
      {notice ? <FormMessage tone={notice.tone}>{notice.text}</FormMessage> : null}

      <Card className="overflow-hidden">
        <div className="space-y-4 border-b border-ink-900/10 p-4 sm:p-5">
          <div className="relative">
            <Search aria-hidden className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-ink-900/60" />
            <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={u.search} aria-label={u.search} className={`${controlClass} h-11 border-ink-900/15 pl-11`} />
          </div>
          <div role="group" aria-label={u.role} className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
            {(['', ...ROLES] as const).map((id) => (
              <button
                key={id || 'all'}
                type="button"
                aria-pressed={role === id}
                onClick={() => {
                  setRole(id)
                  setPage(1)
                }}
                className={`shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${role === id ? 'border-ink-950 bg-ink-950 text-bone-50' : 'border-ink-900/15 bg-white text-ink-900/70 hover:border-ink-900/40 hover:text-ink-900'}`}
              >
                {id ? u.roles[id] : u.all}
                <span className="ml-2 tabular-nums opacity-60">{id ? (result?.roles[id] ?? 0) : allCount}</span>
              </button>
            ))}
          </div>
        </div>

        {result === null ? (
          <Empty>{t.loading}</Empty>
        ) : result.users.length === 0 ? (
          <Empty>{u.none}</Empty>
        ) : (
          <>
            <div aria-hidden className={`hidden border-b border-ink-900/10 bg-slate-50 px-5 py-2.5 lg:grid ${columns}`}>
              <span className={head}>{u.columns.user}</span>
              <span className={head}>{u.columns.phone}</span>
              <span className={head}>{u.columns.role}</span>
              <span className={head}>{u.columns.bookings}</span>
              <span className={head}>{u.columns.joined}</span>
              <span />
            </div>
            <ul className="divide-y divide-ink-900/10">
              {result.users.map((account) => {
                const isSelf = account.id === user.id
                // Mirrors the API: a super admin account is changed by super admins only.
                const locked = account.role === 'superadmin' && actorRole !== 'superadmin'
                return (
                  <li key={account.id} data-testid={`user-${account.email}`}>
                    <div className={`grid gap-x-6 gap-y-1.5 px-5 py-3.5 text-sm sm:grid-cols-2 ${columns}`}>
                      <span className="min-w-0">
                        <span className="block truncate font-medium">
                          {account.name}
                          {isSelf ? <span className="ml-2 text-xs font-normal text-ink-900/55">({u.you})</span> : null}
                        </span>
                        <span className="block truncate text-xs text-ink-900/60">{account.email}</span>
                      </span>
                      <span className="truncate text-ink-900/70">{account.phone ?? '–'}</span>
                      <span>
                        <RoleBadge role={account.role} m={u} />
                      </span>
                      <span className="tabular-nums">{account.bookings}</span>
                      <span className="text-ink-900/70">{formatDate(account.createdAt.slice(0, 10), locale, { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      <span className="flex items-center gap-2 lg:justify-end">
                        {locked ? (
                          <span title={u.locked} className="inline-flex items-center gap-1.5 text-xs text-ink-900/55">
                            <Lock aria-hidden className="size-3.5" />
                            {u.locked}
                          </span>
                        ) : (
                          <>
                            <Button variant="outline" onClick={() => setOpen(open === account.id ? null : account.id)} aria-label={`${u.edit}: ${account.email}`} className="min-h-9 px-4">
                              <Pencil aria-hidden className="size-3.5" />
                              {u.edit}
                            </Button>
                            {isSelf ? null : (
                              <button
                                type="button"
                                onClick={() => setPending({ kind: 'delete', account })}
                                aria-label={`${u.delete}: ${account.email}`}
                                title={u.delete}
                                className="rounded-full p-2 text-ink-900/50 transition-colors hover:bg-red-50 hover:text-red-700"
                              >
                                <Trash2 aria-hidden className="size-4" />
                              </button>
                            )}
                          </>
                        )}
                      </span>
                    </div>
                    {open === account.id ? (
                      <EditAccount key={account.id} account={account} m={u} actorRole={actorRole} isSelf={isSelf} onSaved={done} onCritical={setPending} onCancel={() => setOpen(null)} />
                    ) : null}
                  </li>
                )
              })}
            </ul>
          </>
        )}

        {result && result.total > 0 ? (
          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-ink-900/10 px-5 py-4 text-sm text-ink-900/60">
            <p>{fill(u.total, { count: result.total })}</p>
            {pages > 1 ? (
              <div className="flex items-center gap-3">
                <Button variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                  {a.previous}
                </Button>
                <span>{fill(a.page, { page, pages })}</span>
                <Button variant="outline" disabled={page >= pages} onClick={() => setPage(page + 1)}>
                  {a.next}
                </Button>
              </div>
            ) : null}
          </div>
        ) : null}
      </Card>

      {pending ? <ConfirmCritical key={`${pending.kind}-${pending.account.id}`} pending={pending} m={u} onDone={done} onClose={() => setPending(null)} /> : null}
    </div>
  )
}
