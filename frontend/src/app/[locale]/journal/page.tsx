import type { Metadata } from 'next'
import { ArticleCard } from '@/components/content/Cards'
import { CtaBand } from '@/components/layout/CtaBand'
import { PageHero } from '@/components/layout/PageHero'
import { Section } from '@/components/ui/Section'
import { articles } from '@/content/journal'
import { getCommon, getLocale, getPages } from '@/i18n/server'
import { pageMetadata } from '@/lib/seo'

export async function generateMetadata(): Promise<Metadata> {
  const [locale, p] = await Promise.all([getLocale(), getPages()])
  return pageMetadata({ locale, path: '/journal', title: p.journal.metaTitle, description: p.journal.metaDescription })
}

export default async function JournalPage() {
  const [locale, t, p] = await Promise.all([getLocale(), getCommon(), getPages()])
  return (
    <>
      <PageHero eyebrow={p.journal.eyebrow} title={p.journal.title} lead={p.journal.lead} crumbs={[{ label: t.nav.journal }]} />
      <Section tone="bone">
        <ul className="grid gap-5 sm:grid-cols-2">
          {articles.map((article) => (
            <li key={article.slug} className="reveal">
              <ArticleCard article={article} locale={locale} t={t} p={p} />
            </li>
          ))}
        </ul>
      </Section>
      <CtaBand />
    </>
  )
}
