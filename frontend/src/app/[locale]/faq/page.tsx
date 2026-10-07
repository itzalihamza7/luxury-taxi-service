import type { Metadata } from 'next'
import { Suspense } from 'react'
import { faqJsonLd, FaqList } from '@/components/content/FaqList'
import { JsonLd } from '@/components/content/JsonLd'
import { PhoneButton, WhatsAppButton } from '@/components/layout/ContactButtons'
import { CtaBand } from '@/components/layout/CtaBand'
import { PageHero } from '@/components/layout/PageHero'
import { Section } from '@/components/ui/Section'
import { getCommon, getLocale, getPages } from '@/i18n/server'
import { pageMetadata } from '@/lib/seo'
import { loadCollection } from '@/lib/server-api'

export async function generateMetadata(): Promise<Metadata> {
  const [locale, p] = await Promise.all([getLocale(), getPages()])
  return pageMetadata({ locale, path: '/faq', title: p.faq.metaTitle, description: p.faq.metaDescription })
}

async function Questions() {
  const [faqs, locale] = await Promise.all([loadCollection('faq'), getLocale()])
  const items = faqs.map((faq) => ({ question: faq.question[locale], answer: faq.answer[locale] }))
  return (
    <>
      <JsonLd data={faqJsonLd(items)} />
      <FaqList items={items} />
    </>
  )
}

export default async function FaqPage() {
  const [t, p] = await Promise.all([getCommon(), getPages()])

  return (
    <>
      <PageHero eyebrow={p.faq.eyebrow} title={p.faq.title} lead={p.faq.lead} crumbs={[{ label: t.nav.faq }]} />

      <Section tone="light">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-20">
          <Suspense fallback={<div aria-hidden className="h-96 animate-pulse rounded-md bg-ink-900/5" />}>
            <Questions />
          </Suspense>
          <aside className="on-dark grain rounded-md bg-ink-950 p-7 text-bone-100 lg:sticky lg:top-28 lg:self-start">
            <h2 className="font-display text-3xl text-bone-50">{p.faq.stillTitle}</h2>
            <p className="mt-3 text-[0.9375rem] leading-relaxed text-bone-100/65">{p.faq.stillText}</p>
            <div className="mt-7 flex flex-col gap-3">
              <WhatsAppButton variant="gold" size="md" />
              <PhoneButton size="md" />
            </div>
          </aside>
        </div>
      </Section>

      <CtaBand />
    </>
  )
}
