import type { Metadata } from 'next'
import { Suspense } from 'react'
import { ArticleCard, CardGridSkeleton } from '@/components/content/Cards'
import { CtaBand } from '@/components/layout/CtaBand'
import { PageHero } from '@/components/layout/PageHero'
import { Section } from '@/components/ui/Section'
import { getCommon, getLocale, getPages } from '@/i18n/server'
import { pageMetadata } from '@/lib/seo'
import { loadCollection } from '@/lib/server-api'

export async function generateMetadata(): Promise<Metadata> {
  const [locale, p] = await Promise.all([getLocale(), getPages()])
  return pageMetadata({ locale, path: '/journal', title: p.journal.metaTitle, description: p.journal.metaDescription })
}

const grid = 'grid gap-5 sm:grid-cols-2'

async function ArticleList() {
  const [articles, locale, t, p] = await Promise.all([loadCollection('article'), getLocale(), getCommon(), getPages()])
  return (
    <ul className={grid}>
      {articles.map((article) => (
        <li key={article.slug} className="reveal">
          <ArticleCard article={article} locale={locale} t={t} p={p} />
        </li>
      ))}
    </ul>
  )
}

export default async function JournalPage() {
  const [t, p] = await Promise.all([getCommon(), getPages()])
  return (
    <>
      <PageHero eyebrow={p.journal.eyebrow} title={p.journal.title} lead={p.journal.lead} crumbs={[{ label: t.nav.journal }]} />
      <Section tone="bone">
        <Suspense fallback={<CardGridSkeleton count={4} className={grid} />}>
          <ArticleList />
        </Suspense>
      </Section>
      <CtaBand />
    </>
  )
}
