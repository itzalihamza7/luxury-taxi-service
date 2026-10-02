import { MessageCircle, Phone } from 'lucide-react'
import type { Metadata } from 'next'
import { faqJsonLd, FaqList } from '@/components/content/FaqList'
import { JsonLd } from '@/components/content/JsonLd'
import { CtaBand } from '@/components/layout/CtaBand'
import { PageHero } from '@/components/layout/PageHero'
import { ButtonLink } from '@/components/ui/Button'
import { Section } from '@/components/ui/Section'
import { faqs } from '@/content/faq'
import { phoneHref, site, whatsappHref } from '@/content/site'
import { getCommon, getLocale, getPages } from '@/i18n/server'
import { pageMetadata } from '@/lib/seo'

export async function generateMetadata(): Promise<Metadata> {
  const [locale, p] = await Promise.all([getLocale(), getPages()])
  return pageMetadata({ locale, path: '/faq', title: p.faq.metaTitle, description: p.faq.metaDescription })
}

export default async function FaqPage() {
  const [locale, t, p] = await Promise.all([getLocale(), getCommon(), getPages()])
  const items = faqs.map((faq) => ({ question: faq.question[locale], answer: faq.answer[locale] }))

  return (
    <>
      <JsonLd data={faqJsonLd(items)} />
      <PageHero eyebrow={p.faq.eyebrow} title={p.faq.title} lead={p.faq.lead} crumbs={[{ label: t.nav.faq }]} />

      <Section tone="light">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-20">
          <FaqList items={items} />
          <aside className="on-dark grain rounded-md bg-ink-950 p-7 text-bone-100 lg:sticky lg:top-28 lg:self-start">
            <h2 className="font-display text-3xl text-bone-50">{p.faq.stillTitle}</h2>
            <p className="mt-3 text-[0.9375rem] leading-relaxed text-bone-100/65">{p.faq.stillText}</p>
            <div className="mt-7 flex flex-col gap-3">
              <ButtonLink href={whatsappHref()}>
                <MessageCircle aria-hidden className="size-4" />
                {t.actions.whatsapp}
              </ButtonLink>
              <ButtonLink href={phoneHref} variant="outline-light">
                <Phone aria-hidden className="size-4" />
                {site.phone}
              </ButtonLink>
            </div>
          </aside>
        </div>
      </Section>

      <CtaBand />
    </>
  )
}
