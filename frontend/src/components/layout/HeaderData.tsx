import { Phone } from 'lucide-react'
import { ServiceIcon } from '@/components/content/Cards'
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

/** The services, as menu entries: with their icon and summary for the drop-down, plain for the phone menu. */
export async function ServiceLinks({ mobile }: { mobile?: boolean }) {
  const [locale, services] = await Promise.all([getLocale(), quietly('the services', () => loadCollection('service'), [])])
  if (mobile) {
    return services.map((service) => (
      <li key={service.slug}>
        <Link href={`/services/${service.slug}`} className="block py-2.5 pl-1 text-[0.9375rem] text-bone-50/75 transition-colors hover:text-gold-300">
          {service.title[locale]}
        </Link>
      </li>
    ))
  }
  return services.map((service) => (
    <li key={service.slug}>
      <Link href={`/services/${service.slug}`} className="group/item flex gap-3.5 rounded-lg p-3 transition-colors hover:bg-white/[0.05]">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full border border-gold-300/30 text-gold-300 transition-colors group-hover/item:border-gold-300/70">
          <ServiceIcon name={service.icon} className="size-4" />
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-medium text-bone-50 transition-colors group-hover/item:text-gold-300">{service.title[locale]}</span>
          <span className="mt-0.5 line-clamp-2 block text-xs leading-relaxed text-bone-100/55">{service.summary[locale]}</span>
        </span>
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
