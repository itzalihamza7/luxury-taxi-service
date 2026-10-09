import { FleetManager } from '@/components/admin/FleetManager'
import { adminMetadata } from '@/components/admin/metadata'
import { getManage } from '@/i18n/server'

// Shown only once the browser knows an administrator is signed in, so there is no instant state to validate.
export const instant = false

export const generateMetadata = () => adminMetadata('fleet', '/admin/fleet')

export default async function AdminFleetPage() {
  return <FleetManager m={await getManage()} />
}
