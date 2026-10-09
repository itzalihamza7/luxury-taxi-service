import { adminMetadata } from '@/components/admin/metadata'
import { NewBooking } from '@/components/admin/NewBooking'
import { getBooking, getManage } from '@/i18n/server'

// Shown only once the browser knows an administrator is signed in, so there is no instant state to validate.
export const instant = false

export const generateMetadata = () => adminMetadata('newBooking', '/admin/bookings/new')

export default async function AdminNewBookingPage() {
  const [b, m] = await Promise.all([getBooking(), getManage()])
  return <NewBooking b={b} m={m} />
}
