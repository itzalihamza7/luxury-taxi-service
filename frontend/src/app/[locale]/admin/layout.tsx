import type { ReactNode } from 'react'
import { AdminShell } from '@/components/admin/AdminShell'
import { getManage } from '@/i18n/server'

/** The admin panel has its own frame, a menu on the left and a title bar, instead of the website's header and footer. */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const m = await getManage()
  return (
    <AdminShell nav={m.nav} shell={m.shell}>
      {children}
    </AdminShell>
  )
}
