import { Phone } from 'lucide-react'
import { Link } from '@/components/ui/Link'
import { getLocale } from '@/i18n/server'
import { phoneHref } from '@/lib/contact'
import { loadCollection, quietly } from '@/lib/server-api'
import { contactDetails } from './ContactButtons'

/*
 * The parts of the header that come from the console. They are handed to the
 * header as ready-made pieces, each inside its own <Suspense> boundary, so the
 * header itself (menu button, language switch) works from the first moment.
 */

/** The services, as menu entries: for the drop-down, or for the phone menu. */
export async function ServiceLinks({ mobile }: { mobile?: boolean }) {
  const [locale, services] = await Promise.all([getLocale(), quietly('the services', () => loadCollection('service'), [])])
  const style = mobile ? 'block py-2 pl-4 text-sm text-bone-50/70' : 'block rounded px-4 py-2.5 text-sm text-bone-50/80 transition-colors hover:bg-white/5 hover:text-gold-300'
  return services.map((service) => (
    <li key={service.slug}>
      <Link href={`/services/${service.slug}`} className={style}>
        {service.title[locale]}
      </Link>
    </li>
  ))
}

export async function HeaderPhone() {
  const settings = await contactDetails()
  if (!settings) return null
  return (
    <a href={phoneHref(settings.phone)} className="inline-flex items-center gap-2 text-[0.8125rem] font-medium text-bone-50/80 transition-colors hover:text-gold-300">
      <Phone aria-hidden className="size-3.5" />
      {settings.phone}
    </a>
  )
}
