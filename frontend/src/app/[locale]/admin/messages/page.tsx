import { MessagesList } from '@/components/admin/MessagesList'
import { adminMetadata } from '@/components/admin/metadata'
import { getAccount } from '@/i18n/server'

// Shown only once the browser knows an administrator is signed in, so there is no instant state to validate.
export const instant = false

export const generateMetadata = () => adminMetadata('messages', '/admin/messages')

export default async function AdminMessagesPage() {
  const a = await getAccount()
  return <MessagesList a={a.admin} />
}
