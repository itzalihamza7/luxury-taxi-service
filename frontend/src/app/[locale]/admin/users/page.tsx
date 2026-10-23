import { UsersManager } from '@/components/admin/UsersManager'
import { adminMetadata } from '@/components/admin/metadata'
import { getAccount, getManage } from '@/i18n/server'

// Shown only once the browser knows an administrator is signed in, so there is no instant state to validate.
export const instant = false

export const generateMetadata = () => adminMetadata('users', '/admin/users')

export default async function AdminUsersPage() {
  const [a, m] = await Promise.all([getAccount(), getManage()])
  return <UsersManager a={a.admin} m={m} />
}
