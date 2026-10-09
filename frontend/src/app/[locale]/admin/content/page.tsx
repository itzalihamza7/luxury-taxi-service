import { ContentManager } from '@/components/admin/ContentManager'
import { adminMetadata } from '@/components/admin/metadata'
import { getManage } from '@/i18n/server'

// Shown only once the browser knows an administrator is signed in, so there is no instant state to validate.
export const instant = false

export const generateMetadata = () => adminMetadata('content', '/admin/content')

export default async function AdminContentPage() {
  return <ContentManager m={await getManage()} />
}
