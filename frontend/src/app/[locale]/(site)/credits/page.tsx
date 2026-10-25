import type { Metadata } from 'next'
import { PageHero } from '@/components/layout/PageHero'
import { Section } from '@/components/ui/Section'
import { getLocale, getPages } from '@/i18n/server'
import { pageMetadata } from '@/lib/seo'

/** The 3D car's licence (CC BY 4.0) asks for this credit; every page links here from its footer. */
const MODEL = {
  title: 'Mercedes-Benz Maybach 2022',
  source: 'https://sketchfab.com/3d-models/mercedes-benz-maybach-2022-979f37a878f04b2a8d888b62ea6027e9',
  author: 'Mpgs Studios',
  authorUrl: 'https://sketchfab.com/mpgs.studio',
  license: 'CC BY 4.0',
  licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
}

export async function generateMetadata(): Promise<Metadata> {
  const [locale, p] = await Promise.all([getLocale(), getPages()])
  return pageMetadata({ locale, path: '/credits', title: p.credits.metaTitle, description: p.credits.metaDescription })
}

const link = 'font-medium text-gold-700 underline decoration-gold-700/30 underline-offset-4 transition-colors hover:decoration-gold-700'

export default async function CreditsPage() {
  const p = await getPages()
  const c = p.credits

  return (
    <>
      <PageHero compact eyebrow={c.eyebrow} title={c.title} lead={c.lead} crumbs={[{ label: c.eyebrow }]} />
      <Section tone="light">
        <div className="max-w-3xl space-y-14">
          <section>
            <h2 className="display text-3xl sm:text-4xl">{c.modelTitle}</h2>
            <p className="mt-5 text-lg leading-relaxed text-ink-900/75">
              {c.modelIntro}{' '}
              <a href={MODEL.source} target="_blank" rel="noopener noreferrer" className={link}>
                “{MODEL.title}”
              </a>{' '}
              {c.by}{' '}
              <a href={MODEL.authorUrl} target="_blank" rel="noopener noreferrer" className={link}>
                {MODEL.author}
              </a>
              {c.licensed}{' '}
              <a href={MODEL.licenseUrl} target="_blank" rel="noopener noreferrer" className={link}>
                {MODEL.license}
              </a>
              . {c.changes}
            </p>
          </section>
          <section>
            <h2 className="display text-3xl sm:text-4xl">{c.photoTitle}</h2>
            <p className="mt-5 text-lg leading-relaxed text-ink-900/75">
              {c.photoText}{' '}
              <a href="https://www.pexels.com/license/" target="_blank" rel="noopener noreferrer" className={link}>
                {c.photoLicense}
              </a>
              . {c.photoChanges}
            </p>
          </section>
        </div>
      </Section>
    </>
  )
}
