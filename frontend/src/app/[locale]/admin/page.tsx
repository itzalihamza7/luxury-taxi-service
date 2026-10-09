import { adminMetadata } from '@/components/admin/metadata'
import { Overview } from '@/components/admin/Overview'
import { getAccount, getManage } from '@/i18n/server'

// Shown only once the browser knows an administrator is signed in, so there is no instant state to validate.
export const instant = false

export const generateMetadata = () => adminMetadata('overview', '/admin')

export default async function AdminOverviewPage() {
  const [a, m] = await Promise.all([getAccount(), getManage()])
  return <Overview a={a.admin} m={m} />
}
