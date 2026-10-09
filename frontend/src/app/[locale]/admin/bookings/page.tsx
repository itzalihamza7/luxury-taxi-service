import { BookingsManager } from '@/components/admin/BookingsManager'
import { adminMetadata } from '@/components/admin/metadata'
import { getAccount, getBooking, getManage } from '@/i18n/server'

// Shown only once the browser knows an administrator is signed in, so there is no instant state to validate.
export const instant = false

export const generateMetadata = () => adminMetadata('bookings', '/admin/bookings')

export default async function AdminBookingsPage() {
  const [a, b, m] = await Promise.all([getAccount(), getBooking(), getManage()])
  return <BookingsManager a={a.admin} b={b} m={m} />
}
