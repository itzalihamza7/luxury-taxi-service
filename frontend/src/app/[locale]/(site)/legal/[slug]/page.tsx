import { Info } from 'lucide-react'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { contactDetails } from '@/components/layout/ContactButtons'
import { PageHero } from '@/components/layout/PageHero'
import { PageSkeleton } from '@/components/layout/PageSkeleton'
import { Link } from '@/components/ui/Link'
import { Section } from '@/components/ui/Section'
import { site } from '@/content/site'
import { fill } from '@/i18n/config'
import { getLocale, getPages } from '@/i18n/server'
import { formatDate } from '@/lib/format'
import { pageMetadata } from '@/lib/seo'
import { loadCollection, quietly } from '@/lib/server-api'

export async function generateMetadata({ params }: PageProps<'/[locale]/legal/[slug]'>): Promise<Metadata> {
  const [{ slug }, locale] = await Promise.all([params, getLocale()])
  const document = (await quietly('the legal pages', () => loadCollection('legal'), [])).find((candidate) => candidate.slug === slug)
  if (!document) return {}
  return pageMetadata({ locale, path: `/legal/${document.slug}`, title: document.title[locale], description: document.summary[locale] })
}

/**
 * Legal texts are edited in the console, so each page is rendered on request
 * from the (cached) content. Meanwhile the router shows this page's frame.
 */
export default function LegalPage({ params }: PageProps<'/[locale]/legal/[slug]'>) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <LegalContent params={params} />
    </Suspense>
  )
}

async function LegalContent({ params }: Pick<PageProps<'/[locale]/legal/[slug]'>, 'params'>) {
  const [{ slug }, locale, p, legalDocuments, settings] = await Promise.all([params, getLocale(), getPages(), loadCollection('legal'), contactDetails()])
  const document = legalDocuments.find((candidate) => candidate.slug === slug)
  if (!document) notFound()

  // The texts say `{companyName}`, `{email}` and so on; the business details saved in the console go in their place.
  const details: Record<string, string> = settings
    ? { ...settings.legal, email: settings.email, phone: settings.phone, brand: site.name }
    : { brand: site.name }
  const text = (value: string) => fill(value, details)

  return (
    <>
      <PageHero compact eyebrow={p.legal.eyebrow} title={document.title[locale]} lead={document.summary[locale]} crumbs={[{ label: document.title[locale] }]} />
      <Section tone="light">
        <div className="grid gap-12 lg:grid-cols-[16rem_minmax(0,1fr)] lg:gap-20">
          <nav aria-label={p.legal.eyebrow} className="lg:sticky lg:top-28 lg:self-start">
            <ul className="space-y-1 border-l border-ink-900/10">
              {legalDocuments.map((other) => (
                <li key={other.slug}>
                  <Link
                    href={`/legal/${other.slug}`}
                    aria-current={other.slug === document.slug ? 'page' : undefined}
                    className={`-ml-px block border-l py-2 pl-5 text-sm transition-colors ${
                      other.slug === document.slug ? 'border-gold-600 font-semibold text-ink-900' : 'border-transparent text-ink-900/60 hover:border-ink-900/30 hover:text-ink-900'
                    }`}
                  >
                    {other.title[locale]}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <article className="max-w-3xl">
            <p className="flex items-start gap-3 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-900">
              <Info aria-hidden className="mt-0.5 size-4 shrink-0" />
              {p.legal.template}
            </p>
            <p className="mt-6 text-sm text-ink-900/60">{fill(p.legal.updated, { date: formatDate(document.updated, locale) })}</p>

            {document.sections[locale].map((section) => (
              <section key={section.heading ?? section.paragraphs[0]} className="mt-10">
                {section.heading ? <h2 className="font-display text-3xl">{text(section.heading)}</h2> : null}
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph} className="mt-4 leading-relaxed text-ink-900/75">
                    {text(paragraph)}
                  </p>
                ))}
                {section.list ? (
                  <ul className="mt-4 list-disc space-y-2.5 pl-5 leading-relaxed text-ink-900/75 marker:text-gold-600">
                    {section.list.map((item) => (
                      <li key={item}>{text(item)}</li>
                    ))}
                  </ul>
                ) : null}
              </section>
            ))}
          </article>
        </div>
      </Section>
    </>
  )
}
