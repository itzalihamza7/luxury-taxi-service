import { Clock, Mail, MapPin, MessageCircle, Phone } from 'lucide-react'
import { Wordmark } from '@/components/ui/Brand'
import { ButtonLink } from '@/components/ui/Button'
import { Link } from '@/components/ui/Link'
import { services } from '@/content/services'
import { emailHref, phoneHref, site, whatsappHref } from '@/content/site'
import { fill } from '@/i18n/config'
import { getCommon, getLocale } from '@/i18n/server'
import { CookieSettingsButton } from './CookieConsent'
import { NewsletterForm } from './NewsletterForm'

const heading = 'eyebrow text-gold-300/90'
const link = 'text-sm text-bone-100/65 transition-colors hover:text-gold-300'

export async function Footer({ year }: { year: number }) {
  const locale = await getLocale()
  const t = await getCommon()

  const company = [
    { href: '/about', label: t.nav.about },
    { href: '/fleet', label: t.nav.fleet },
    { href: '/routes', label: t.nav.routes },
    { href: '/events', label: t.nav.events },
    { href: '/journal', label: t.nav.journal },
    { href: '/faq', label: t.nav.faq },
    { href: '/contact', label: t.nav.contact },
    { href: '/booking/track', label: t.nav.track },
  ]
  const legal = [
    { href: '/legal/terms', label: t.footer.terms },
    { href: '/legal/privacy', label: t.footer.privacy },
    { href: '/legal/legal-notice', label: t.footer.notice },
    { href: '/legal/cookies', label: t.footer.cookies },
    { href: '/legal/accessibility', label: t.footer.accessibility },
  ]
  const social = [
    { href: site.social.instagram, label: 'Instagram' },
    { href: site.social.tripadvisor, label: 'Tripadvisor' },
  ].filter((entry) => entry.href)

  return (
    <footer className="no-print grain bg-ink-950 pb-24 text-bone-100 lg:pb-0">
      <div className="container-page grid gap-14 border-t border-white/10 py-16 lg:grid-cols-12 lg:gap-10 lg:py-20">
        <div className="lg:col-span-4">
          <Wordmark className="text-bone-50" />
          <p className="mt-6 max-w-sm text-sm leading-relaxed text-bone-100/65">{t.footer.blurb}</p>
          <div className="mt-7 flex flex-wrap items-center gap-5">
            <ButtonLink href="/booking" arrow>
              {t.actions.book}
            </ButtonLink>
            {social.map((entry) => (
              <a key={entry.label} href={entry.href} target="_blank" rel="noopener noreferrer" className={link}>
                {entry.label}
              </a>
            ))}
          </div>
        </div>

        <nav aria-label={t.footer.company} className="lg:col-span-2">
          <h2 className={heading}>{t.footer.company}</h2>
          <ul className="mt-5 space-y-3">
            {company.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className={link}>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label={t.footer.services} className="lg:col-span-2">
          <h2 className={heading}>{t.footer.services}</h2>
          <ul className="mt-5 space-y-3">
            {services.map((service) => (
              <li key={service.slug}>
                <Link href={`/services/${service.slug}`} className={link}>
                  {service.title[locale]}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="lg:col-span-4">
          <h2 className={heading}>{t.footer.contact}</h2>
          <ul className="mt-5 space-y-3 text-sm text-bone-100/65">
            <li>
              <a href={phoneHref} className="inline-flex items-center gap-3 transition-colors hover:text-gold-300">
                <Phone aria-hidden className="size-4 text-gold-300/80" />
                {site.phone}
              </a>
            </li>
            <li>
              <a href={whatsappHref()} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-3 transition-colors hover:text-gold-300">
                <MessageCircle aria-hidden className="size-4 text-gold-300/80" />
                WhatsApp
              </a>
            </li>
            <li>
              <a href={emailHref} className="inline-flex items-center gap-3 transition-colors hover:text-gold-300">
                <Mail aria-hidden className="size-4 text-gold-300/80" />
                {site.email}
              </a>
            </li>
            <li className="flex items-center gap-3">
              <MapPin aria-hidden className="size-4 text-gold-300/80" />
              {t.contact.based}
            </li>
            <li className="flex items-center gap-3">
              <Clock aria-hidden className="size-4 text-gold-300/80" />
              {t.contact.hours}
            </li>
          </ul>

          <div className="mt-9 border-t border-white/10 pt-8">
            <h2 className="font-display text-xl text-bone-50">{t.newsletter.title}</h2>
            <p className="mt-2 text-sm text-bone-100/55">{t.newsletter.text}</p>
            <NewsletterForm />
          </div>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="container-page flex flex-col gap-4 py-7 text-xs text-bone-100/55 lg:flex-row lg:items-center lg:justify-between">
          <p>{fill(t.footer.rights, { year, name: `${site.name} ${site.descriptor}` })}</p>
          <ul className="flex flex-wrap gap-x-6 gap-y-2">
            {legal.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="transition-colors hover:text-gold-300">
                  {item.label}
                </Link>
              </li>
            ))}
            <li>
              <CookieSettingsButton />
            </li>
          </ul>
        </div>
      </div>
    </footer>
  )
}
