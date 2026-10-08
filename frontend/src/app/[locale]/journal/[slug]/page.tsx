import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { ArticleCard } from '@/components/content/Cards'
import { JsonLd } from '@/components/content/JsonLd'
import { CtaBand } from '@/components/layout/CtaBand'
import { PageHero } from '@/components/layout/PageHero'
import { PageSkeleton } from '@/components/layout/PageSkeleton'
import { ButtonLink } from '@/components/ui/Button'
import { Section, SectionHeading } from '@/components/ui/Section'
import { site, siteUrl } from '@/content/site'
import { fill, href } from '@/i18n/config'
import { getCommon, getLocale, getPages } from '@/i18n/server'
import { formatDate } from '@/lib/format'
import { pageMetadata } from '@/lib/seo'
import { loadCollection, quietly } from '@/lib/server-api'

export async function generateMetadata({ params }: PageProps<'/[locale]/journal/[slug]'>): Promise<Metadata> {
  const [{ slug }, locale] = await Promise.all([params, getLocale()])
  const article = (await quietly('the articles', () => loadCollection('article'), [])).find((candidate) => candidate.slug === slug)
  if (!article) return {}
  const meta = pageMetadata({ locale, path: `/journal/${article.slug}`, title: article.title[locale], description: article.excerpt[locale] })
  return { ...meta, openGraph: { ...meta.openGraph, type: 'article', publishedTime: article.date } }
}

/**
 * Articles are edited in the console, so each page is rendered on request from
 * the (cached) content. Meanwhile the router shows this page's frame.
 */
export default function ArticlePage({ params }: PageProps<'/[locale]/journal/[slug]'>) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ArticleContent params={params} />
    </Suspense>
  )
}

async function ArticleContent({ params }: Pick<PageProps<'/[locale]/journal/[slug]'>, 'params'>) {
  const [{ slug }, locale, t, p, articles] = await Promise.all([params, getLocale(), getCommon(), getPages(), loadCollection('article')])
  const article = articles.find((candidate) => candidate.slug === slug)
  if (!article) notFound()

  const publisher = `${site.name} ${site.descriptor}`
  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: article.title[locale],
          description: article.excerpt[locale],
          datePublished: article.date,
          inLanguage: locale,
          mainEntityOfPage: `${siteUrl}${href(locale, `/journal/${article.slug}`)}`,
          author: { '@type': 'Organization', name: publisher },
          publisher: { '@type': 'Organization', name: publisher },
        }}
      />
      <PageHero eyebrow={article.category[locale]} title={article.title[locale]} lead={article.excerpt[locale]} crumbs={[{ label: t.nav.journal, href: '/journal' }, { label: article.category[locale] }]} image={article.image}>
        <p className="text-sm text-bone-100/55">
          {p.journal.published} <time dateTime={article.date}>{formatDate(article.date, locale)}</time> · {fill(p.journal.minutes, { count: article.minutes })}
        </p>
      </PageHero>

      <Section tone="light">
        <article className="mx-auto max-w-3xl">
          {article.body[locale].map((section, index) => (
            <section key={section.heading ?? index} className={index > 0 ? 'mt-12' : ''}>
              {section.heading ? <h2 className="display text-3xl sm:text-4xl">{section.heading}</h2> : null}
              {section.paragraphs.map((paragraph, position) => (
                <p key={paragraph} className={`${section.heading || position > 0 ? 'mt-5' : ''} leading-relaxed text-ink-900/75 ${index === 0 ? 'font-display text-2xl leading-snug text-ink-900 sm:text-[1.75rem]' : 'text-lg'}`}>
                  {paragraph}
                </p>
              ))}
              {section.list ? (
                <ul className="mt-6 space-y-3 border-l-2 border-gold-500/50 pl-6 text-lg leading-relaxed text-ink-900/75">
                  {section.list.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : null}
            </section>
          ))}

          <div className="mt-14 flex flex-wrap items-center gap-4 border-t border-ink-900/10 pt-10">
            <ButtonLink href={article.cta.href} variant="dark" size="lg" arrow>
              {article.cta.label[locale]}
            </ButtonLink>
            <ButtonLink href="/booking" variant="outline" size="lg">
              {t.actions.getPrice}
            </ButtonLink>
          </div>
        </article>
      </Section>

      <Section tone="bone">
        <SectionHeading eyebrow={p.journal.eyebrow} title={p.journal.moreTitle} />
        <ul className="grid gap-5 lg:grid-cols-3">
          {articles
            .filter((other) => other.slug !== article.slug)
            .slice(0, 3)
            .map((other) => (
              <li key={other.slug} className="reveal">
                <ArticleCard article={other} locale={locale} t={t} p={p} />
              </li>
            ))}
        </ul>
      </Section>

      <CtaBand />
    </>
  )
}
