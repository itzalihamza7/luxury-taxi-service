import { WhatsAppClicks } from '@/components/admin/WhatsAppClicks'
import { adminMetadata } from '@/components/admin/metadata'
import { getAccount, getManage } from '@/i18n/server'

// Shown only once the browser knows an administrator is signed in, so there is no instant state to validate.
export const instant = false

export const generateMetadata = () => adminMetadata('whatsapp', '/admin/whatsapp')

export default async function AdminWhatsAppPage() {
  const [a, m] = await Promise.all([getAccount(), getManage()])
  return <WhatsAppClicks a={a.admin} m={m} />
}
