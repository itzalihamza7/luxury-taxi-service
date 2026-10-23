'use client'

import { CalendarCheck, ChevronDown, LayoutDashboard, LogOut, Search, UserRound, type LucideIcon } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { useAuth } from '@/components/auth/AuthProvider'
import { ButtonLink } from '@/components/ui/Button'
import { Link } from '@/components/ui/Link'
import { useI18n } from '@/i18n/client'
import type { CommonMessages } from '@/i18n/messages/common'
import { isStaff, type User } from '@/lib/types'

interface Item {
  href: string
  label: string
  icon: LucideIcon
  /** The admin panel stands out from a customer's own pages. */
  accent?: boolean
}

/** Where a signed-in visitor can go: their own pages, and the admin panel for the team. */
function accountItems(user: User, t: CommonMessages): Item[] {
  return [
    ...(isStaff(user) ? [{ href: '/admin', label: t.nav.admin, icon: LayoutDashboard, accent: true }] : []),
    { href: '/account', label: t.nav.myBookings, icon: CalendarCheck },
    { href: '/account?tab=profile', label: t.nav.myDetails, icon: UserRound },
  ]
}

function Avatar({ user, className = 'size-7 text-xs' }: { user: User; className?: string }) {
  return (
    <span aria-hidden className={`flex shrink-0 items-center justify-center rounded-full border border-gold-300/50 bg-gold-300/10 font-semibold text-gold-300 ${className}`}>
      {user.name.trim().charAt(0).toUpperCase()}
    </span>
  )
}

function Identity({ user }: { user: User }) {
  const { t } = useI18n()
  return (
    <div className="flex items-center gap-3">
      <Avatar user={user} className="size-10 text-sm" />
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-bone-50">{user.name}</p>
        <p className="truncate text-xs text-bone-50/55">{user.email}</p>
        {isStaff(user) ? <p className="mt-1.5 text-[0.625rem] font-semibold tracking-[0.16em] text-gold-300 uppercase">{user.role === 'superadmin' ? t.nav.superAdministrator : t.nav.administrator}</p> : null}
      </div>
    </div>
  )
}

const row = 'flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm transition-colors'
const plain = 'text-bone-50/80 hover:bg-white/5 hover:text-bone-50'

function ItemLink({ item }: { item: Item }) {
  const Icon = item.icon
  return (
    <Link href={item.href} className={`${row} ${item.accent ? 'bg-gold-300/10 font-medium text-gold-300 hover:bg-gold-300/15' : plain}`}>
      <Icon aria-hidden strokeWidth={1.75} className="size-4 shrink-0" />
      {item.label}
    </Link>
  )
}

/**
 * The account button in the header. It opens a panel with the visitor's own
 * pages and "Sign out", or the ways to sign in.
 */
export function AccountMenu() {
  const { t } = useI18n()
  const { user, signOut } = useAuth()
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const button = useRef<HTMLButtonElement>(null)
  const panelId = useId()

  // Close when the visitor clicks or tabs elsewhere, or presses Escape.
  useEffect(() => {
    if (!open) return
    const onOutside = (event: Event) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setOpen(false)
      button.current?.focus()
    }
    document.addEventListener('pointerdown', onOutside)
    document.addEventListener('focusin', onOutside)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onOutside)
      document.removeEventListener('focusin', onOutside)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={root} className="relative">
      <button
        ref={button}
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={user ? `${t.nav.accountMenu}: ${user.name}` : t.nav.accountMenu}
        title={t.nav.accountMenu}
        className={`flex h-10 items-center gap-1 rounded-full pl-1.5 pr-1 transition-colors hover:text-gold-300 ${open ? 'text-gold-300' : 'text-bone-50/80'}`}
      >
        {user ? <Avatar user={user} /> : <UserRound aria-hidden className="mx-1 size-[1.125rem]" />}
        <ChevronDown aria-hidden className={`size-3 transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open ? (
        <div
          id={panelId}
          // Following a link in the panel closes it.
          onClick={(event) => {
            if ((event.target as HTMLElement).closest('a')) setOpen(false)
          }}
          className="absolute right-0 top-full mt-3 w-72 origin-top-right animate-pop overflow-hidden rounded-lg border border-white/10 bg-ink-900 shadow-[0_24px_60px_-12px_rgba(0,0,0,0.7)]"
        >
          {user ? (
            <>
              <div className="border-b border-white/10 p-4">
                <Identity user={user} />
              </div>
              <ul className="space-y-0.5 p-2">
                {accountItems(user, t).map((item) => (
                  <li key={item.href}>
                    <ItemLink item={item} />
                  </li>
                ))}
                <li>
                  <ItemLink item={{ href: '/booking/track', label: t.nav.track, icon: Search }} />
                </li>
              </ul>
              <div className="border-t border-white/10 p-2">
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false)
                    void signOut()
                  }}
                  className={`${row} ${plain}`}
                >
                  <LogOut aria-hidden strokeWidth={1.75} className="size-4 shrink-0" />
                  {t.nav.signOut}
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="border-b border-white/10 p-5">
                <p className="text-sm font-semibold text-bone-50">{t.nav.account}</p>
                <p className="mt-1 text-xs leading-relaxed text-bone-50/55">{t.nav.accountLead}</p>
                <ButtonLink href="/login" className="mt-4 w-full">
                  {t.nav.signIn}
                </ButtonLink>
                <Link href="/register" className="mt-3 block text-center text-sm text-bone-50/70 underline-offset-4 transition-colors hover:text-gold-300 hover:underline">
                  {t.nav.createAccount}
                </Link>
              </div>
              <div className="p-2">
                <ItemLink item={{ href: '/booking/track', label: t.nav.track, icon: Search }} />
              </div>
            </>
          )}
        </div>
      ) : null}
    </div>
  )
}

/** The same choices, laid out for the phone menu. `onDone` closes that menu. */
export function MobileAccount({ onDone }: { onDone: () => void }) {
  const { t } = useI18n()
  const { user, signOut } = useAuth()

  if (!user) {
    return (
      <div className="grid grid-cols-2 gap-3">
        <ButtonLink href="/login" variant="outline-light">
          {t.nav.signIn}
        </ButtonLink>
        <ButtonLink href="/register" variant="outline-light">
          {t.nav.createAccount}
        </ButtonLink>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-white/10">
      <div className="border-b border-white/10 p-4">
        <Identity user={user} />
      </div>
      <ul className="space-y-0.5 p-2">
        {accountItems(user, t).map((item) => (
          <li key={item.href}>
            <ItemLink item={item} />
          </li>
        ))}
        <li>
          <button
            type="button"
            onClick={() => {
              onDone()
              void signOut()
            }}
            className={`${row} ${plain}`}
          >
            <LogOut aria-hidden strokeWidth={1.75} className="size-4 shrink-0" />
            {t.nav.signOut}
          </button>
        </li>
      </ul>
    </div>
  )
}
