import { Clock, Mail, MapPin, MessageCircle, Phone } from 'lucide-react'
import type { Metadata } from 'next'
import { Suspense } from 'react'
import { ContactForm } from '@/components/content/ContactForm'
import { contactDetails, PhoneButton, WhatsAppButton } from '@/components/layout/ContactButtons'
import { PageHero } from '@/components/layout/PageHero'
import { ButtonLink } from '@/components/ui/Button'
import { Section } from '@/components/ui/Section'
import { getCommon, getLocale, getPages } from '@/i18n/server'
import { emailHref, phoneHref, whatsappHref } from '@/lib/contact'
import { pageMetadata } from '@/lib/seo'

export async function generateMetadata(): Promise<Metadata> {
  const [locale, p] = await Promise.all([getLocale(), getPages()])
  return pageMetadata({ locale, path: '/contact', title: p.contact.metaTitle, description: p.contact.metaDescription })
}

/** How to reach the business. The phone, WhatsApp and email lines come from the console. */
async function Details() {
  const [t, settings] = await Promise.all([getCommon(), contactDetails()])
  const details = [
    ...(settings
      ? [
          { icon: Phone, label: t.contact.phoneLabel, value: settings.phone, href: phoneHref(settings.phone) },
          { icon: MessageCircle, label: 'WhatsApp', value: settings.phone, href: whatsappHref(settings.whatsapp) },
          { icon: Mail, label: t.contact.emailLabel, value: settings.email, href: emailHref(settings.email) },
        ]
      : []),
    { icon: MapPin, label: t.contact.basedLabel, value: t.contact.based, href: undefined },
    { icon: Clock, label: t.contact.hoursLabel, value: t.contact.hours, href: undefined },
  ]

  return (
    <dl className="mt-6 space-y-5">
      {details.map((detail) => (
        <div key={detail.label} className="flex items-start gap-4">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-bone-100 text-gold-700">
            <detail.icon aria-hidden strokeWidth={1.5} className="size-[1.125rem]" />
          </span>
          <div>
            <dt className="eyebrow text-ink-900/60">{detail.label}</dt>
            <dd className="mt-1 font-medium">
              {detail.href ? (
                <a href={detail.href} {...(detail.href.startsWith('http') ? { target: '_blank', rel: 'noopener noreferrer' } : {})} className="underline-offset-4 hover:text-gold-700 hover:underline">
                  {detail.value}
                </a>
              ) : (
                detail.value
              )}
            </dd>
          </div>
        </div>
      ))}
    </dl>
  )
}

export default async function ContactPage() {
  const [t, p] = await Promise.all([getCommon(), getPages()])
  const c = p.contact

  return (
    <>
      <PageHero eyebrow={c.eyebrow} title={c.title} lead={c.lead} crumbs={[{ label: t.nav.contact }]}>
        <WhatsAppButton variant="gold" />
        <PhoneButton />
      </PageHero>

      <Section tone="bone">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] lg:gap-16">
          <ContactForm c={c} />

          <div className="space-y-6">
            <div className="rounded-md border border-ink-900/10 bg-white p-7">
              <h2 className="font-display text-3xl">{c.detailsTitle}</h2>
              <Suspense fallback={<div aria-hidden className="mt-6 h-72 animate-pulse rounded-md bg-ink-900/5" />}>
                <Details />
              </Suspense>
              <p className="mt-6 border-t border-ink-900/10 pt-5 text-sm text-ink-900/60">{t.contact.notice}</p>
            </div>

            <div className="on-dark grain rounded-md bg-ink-950 p-7 text-bone-100">
              <h2 className="font-display text-3xl text-bone-50">{c.quickTitle}</h2>
              <p className="mt-3 text-[0.9375rem] leading-relaxed text-bone-100/65">{c.quickText}</p>
              <ButtonLink href="/booking" arrow className="mt-6">
                {t.actions.getPrice}
              </ButtonLink>
            </div>
          </div>
        </div>
      </Section>
    </>
  )
}
