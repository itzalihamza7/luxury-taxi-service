import { BusinessDetails } from '@/components/admin/BusinessDetails'
import { adminMetadata } from '@/components/admin/metadata'
import { getManage } from '@/i18n/server'

// Shown only once the browser knows an administrator is signed in, so there is no instant state to validate.
export const instant = false

export const generateMetadata = () => adminMetadata('settings', '/admin/settings')

export default async function AdminSettingsPage() {
  return <BusinessDetails m={await getManage()} />
}
