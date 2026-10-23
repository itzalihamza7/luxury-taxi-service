'use client'

import { CalendarCheck, CarFront, ExternalLink, FileText, Inbox, LayoutDashboard, LogOut, Menu, MessageCircle, PhoneCall, Plus, Settings, Users, X, type LucideIcon } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useAuth } from '@/components/auth/AuthProvider'
import { useCurrentPath } from '@/components/layout/CurrentPath'
import { LanguageSwitch } from '@/components/layout/LanguageSwitch'
import { Monogram } from '@/components/ui/Brand'
import { ButtonLink } from '@/components/ui/Button'
import { Link } from '@/components/ui/Link'
import { site } from '@/content/site'
import { useI18n } from '@/i18n/client'
import { href } from '@/i18n/config'
import type { ManageMessages } from '@/i18n/messages/manage'
import { api } from '@/lib/api'
import { isStaff, type BookingStatus } from '@/lib/types'

/** The numbers behind the overview and the badges in the menu. */
export interface Summary {
  bookings: Record<BookingStatus, number>
  upcoming: number
  messages: number
  subscribers: number
}

interface AdminValue {
  summary: Summary | null
  /** Call after changing a booking, so the counts follow. */
  refresh: () => void
}

const AdminContext = createContext<AdminValue | null>(null)

export function useAdminSummary(): AdminValue {
  const value = useContext(AdminContext)
  if (!value) throw new Error('useAdminSummary must be used inside <AdminShell>')
  return value
}

type Section = keyof ManageMessages['nav']
type Group = keyof ManageMessages['shell']['groups']

interface NavItem {
  id: Section
  href: string
  icon: LucideIcon
}

const NAV: { group?: Group; items: NavItem[] }[] = [
  { items: [{ id: 'overview', href: '/admin', icon: LayoutDashboard }] },
  {
    group: 'operations',
    items: [
      { id: 'bookings', href: '/admin/bookings', icon: CalendarCheck },
      { id: 'newBooking', href: '/admin/bookings/new', icon: PhoneCall },
      { id: 'messages', href: '/admin/messages', icon: Inbox },
      { id: 'whatsapp', href: '/admin/whatsapp', icon: MessageCircle },
      { id: 'users', href: '/admin/users', icon: Users },
    ],
  },
  {
    group: 'website',
    items: [
      { id: 'fleet', href: '/admin/fleet', icon: CarFront },
      { id: 'content', href: '/admin/content', icon: FileText },
      { id: 'settings', href: '/admin/settings', icon: Settings },
    ],
  },
]

/** The page's address without its language: `/en/admin/fleet` -> `/admin/fleet`. */
const withoutLocale = (pathname: string) => pathname.replace(/^\/[^/]+/, '') || '/'

/** The menu entry the current page belongs to: the most specific one that matches. */
function currentSection(pathname: string | null): NavItem | null {
  if (!pathname) return null
  const path = withoutLocale(pathname)
  let best: NavItem | null = null
  for (const item of NAV.flatMap((group) => group.items)) {
    if ((path === item.href || path.startsWith(`${item.href}/`)) && item.href.length > (best?.href.length ?? 0)) best = item
  }
  return best
}

interface Props {
  nav: ManageMessages['nav']
  shell: ManageMessages['shell']
  children: ReactNode
}

/**
 * The frame of the admin panel: a menu on the left, a bar with the page title
 * on top. It also keeps everyone but the team out, so the pages inside do not
 * have to.
 */
export function AdminShell({ nav, shell, children }: Props) {
  const { t, locale } = useI18n()
  const { user, ready, signOut } = useAuth()
  const router = useRouter()
  const pathname = useCurrentPath()
  const [menu, setMenu] = useState(false)
  const [summary, setSummary] = useState<Summary | null>(null)
  const [reload, setReload] = useState(0)

  const isAdmin = isStaff(user)

  // Signed-out visitors are sent to sign in, and brought back to the same page afterwards.
  useEffect(() => {
    if (ready && !user) router.replace(`${href(locale, '/login')}?next=${encodeURIComponent(pathname ? withoutLocale(pathname) : '/admin')}`)
  }, [ready, user, router, locale, pathname])

  // Counts are read again on every page of the panel, and whenever a page says they changed.
  useEffect(() => {
    if (!isAdmin) return
    let active = true
    api<Summary>('/admin/summary')
      .then((result) => {
        if (active) setSummary(result)
      })
      .catch(() => undefined)
    return () => {
      active = false
    }
  }, [isAdmin, reload, pathname])

  // Lock page scroll while the menu covers the page on a phone.
  useEffect(() => {
    document.body.style.overflow = menu ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [menu])

  const refresh = useCallback(() => setReload((count) => count + 1), [])
  const value = useMemo(() => ({ summary, refresh }), [summary, refresh])

  if (!user) {
    return (
      <div aria-busy="true" className="flex flex-1 flex-col items-center justify-center gap-4 bg-slate-100 text-ink-900/60">
        <Monogram className="size-11 text-ink-900/40" />
        <p className="text-sm">{t.loading}</p>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-1 items-center justify-center bg-slate-100 p-6">
        <div className="w-full max-w-md rounded-xl border border-ink-900/10 bg-white p-8 text-center">
          <p className="text-ink-900/70">{shell.forbidden}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <ButtonLink href="/account" variant="dark">
              {t.nav.account}
            </ButtonLink>
            <ButtonLink href="/" variant="outline">
              {shell.viewSite}
            </ButtonLink>
          </div>
        </div>
      </div>
    )
  }

  const active = currentSection(pathname)
  const pending = summary?.bookings.pending ?? 0
  const footRow = 'flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm text-bone-50/65 transition-colors hover:bg-white/5 hover:text-bone-50'

  return (
    <AdminContext value={value}>
      <div className="flex flex-1 bg-slate-100 text-ink-900">
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-gold-400 focus:px-4 focus:py-2 focus:text-sm focus:text-ink-950">
          {t.nav.skip}
        </a>

        {/* On a phone the menu slides in over the page; from `lg` up it is always there. */}
        <aside
          id="admin-menu"
          className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-ink-950 text-bone-50 transition-[transform,visibility] duration-300 ease-out-expo lg:visible lg:translate-x-0 ${menu ? 'visible translate-x-0' : 'invisible -translate-x-full'}`}
        >
          <div className="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-white/10 px-5">
            <Link href="/admin" className="flex min-w-0 items-center gap-3" onClick={() => setMenu(false)}>
              <Monogram className="size-9 shrink-0 text-bone-50" />
              <span className="min-w-0 leading-tight">
                <span className="block truncate text-sm font-semibold tracking-wide">
                  {site.name}
                </span>
                <span className="block text-[0.6875rem] font-medium tracking-[0.14em] text-bone-50/50 uppercase">{shell.title}</span>
              </span>
            </Link>
            <button type="button" onClick={() => setMenu(false)} aria-label={shell.close} className="-mr-2 rounded-full p-2 text-bone-50/70 hover:text-bone-50 lg:hidden">
              <X aria-hidden className="size-5" />
            </button>
          </div>

          {/* Following a link closes the menu on a phone. */}
          <nav
            aria-label={shell.navigation}
            className="flex-1 overflow-y-auto px-3 py-4"
            onClick={(event) => {
              if ((event.target as HTMLElement).closest('a')) setMenu(false)
            }}
          >
            {NAV.map((group, index) => (
              <div key={group.group ?? index}>
                {group.group ? <p className="px-3 pb-2 pt-6 text-[0.625rem] font-semibold tracking-[0.18em] text-bone-50/40 uppercase">{shell.groups[group.group]}</p> : null}
                <ul className="space-y-0.5">
                  {group.items.map((item) => {
                    const Icon = item.icon
                    const current = active?.id === item.id
                    return (
                      <li key={item.id}>
                        <Link
                          href={item.href}
                          aria-current={current ? 'page' : undefined}
                          className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${current ? 'bg-white/10 text-bone-50' : 'text-bone-50/65 hover:bg-white/5 hover:text-bone-50'}`}
                        >
                          <Icon aria-hidden strokeWidth={1.75} className={`size-[1.125rem] shrink-0 ${current ? 'text-gold-300' : ''}`} />
                          <span className="min-w-0 flex-1 truncate">{nav[item.id]}</span>
                          {item.id === 'bookings' && pending > 0 ? (
                            <span title={t.status.pending} className="rounded-full bg-gold-400 px-2 py-0.5 text-[0.6875rem] font-semibold text-ink-950 tabular-nums">
                              {pending}
                            </span>
                          ) : null}
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))}
          </nav>

          <div className="shrink-0 border-t border-white/10 p-3">
            <div className="flex items-center gap-3 px-3 py-2">
              <span aria-hidden className="flex size-9 shrink-0 items-center justify-center rounded-full border border-gold-300/50 bg-gold-300/10 text-sm font-semibold text-gold-300">
                {user.name.trim().charAt(0).toUpperCase()}
              </span>
              <span className="min-w-0 flex-1 leading-tight">
                <span className="block truncate text-sm font-medium">{user.name}</span>
                <span className="block truncate text-xs text-bone-50/50">{user.email}</span>
              </span>
            </div>
            <Link href="/" className={footRow}>
              <ExternalLink aria-hidden strokeWidth={1.75} className="size-[1.125rem] shrink-0" />
              {shell.viewSite}
            </Link>
            <button type="button" onClick={() => void signOut()} className={footRow}>
              <LogOut aria-hidden strokeWidth={1.75} className="size-[1.125rem] shrink-0" />
              {t.nav.signOut}
            </button>
            <LanguageSwitch className="px-3 pb-1 pt-3" />
          </div>
        </aside>
        {menu ? <button type="button" aria-label={shell.close} onClick={() => setMenu(false)} className="fixed inset-0 z-30 bg-ink-950/60 backdrop-blur-sm lg:hidden" /> : null}

        <div className="flex min-w-0 flex-1 flex-col lg:pl-64">
          <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center gap-3 border-b border-ink-900/10 bg-white/90 px-4 backdrop-blur-md sm:px-6 lg:px-8">
            <button type="button" onClick={() => setMenu(true)} aria-expanded={menu} aria-controls="admin-menu" aria-label={shell.menu} className="-ml-2 rounded-full p-2 text-ink-900/70 hover:text-ink-900 lg:hidden">
              <Menu aria-hidden className="size-5" />
            </button>
            <h1 className="min-w-0 truncate text-lg font-semibold tracking-tight">{active ? nav[active.id] : shell.title}</h1>
            {active?.id === 'newBooking' ? null : (
              <ButtonLink href="/admin/bookings/new" variant="dark" className="ml-auto">
                <Plus aria-hidden className="size-4" />
                {nav.newBooking}
              </ButtonLink>
            )}
          </header>

          <main id="main" className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            <div className="mx-auto w-full max-w-6xl">{children}</div>
          </main>
        </div>
      </div>
    </AdminContext>
  )
}
