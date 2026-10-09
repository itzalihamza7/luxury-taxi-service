import type { Metadata } from 'next'
import type { ManageMessages } from '@/i18n/messages/manage'
import { getLocale, getManage } from '@/i18n/server'
import { pageMetadata } from '@/lib/seo'

/** Title for a page of the admin panel. None of them belong in search results. */
export async function adminMetadata(section: keyof ManageMessages['nav'], path: string): Promise<Metadata> {
  const [locale, m] = await Promise.all([getLocale(), getManage()])
  return pageMetadata({ locale, path, title: `${m.nav[section]} · ${m.shell.title}`, description: m.shell.description, noIndex: true })
}
