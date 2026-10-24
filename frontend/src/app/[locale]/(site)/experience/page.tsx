import type { Metadata } from 'next'
import localFont from 'next/font/local'
import { ExperienceFilm } from '@/components/experience/ExperienceFilm'
import { FILM } from '@/components/experience/film'
import { WhatsAppButton } from '@/components/layout/ContactButtons'
import { CtaBand } from '@/components/layout/CtaBand'
import { ButtonLink } from '@/components/ui/Button'
import { Photo } from '@/components/ui/Photo'
import { Accent, Eyebrow, Section, SectionHeading } from '@/components/ui/Section'
import { getCommon, getLocale, getPages } from '@/i18n/server'
import { pageMetadata } from '@/lib/seo'

// This page sets its words in Cormorant Garamond and Manrope (SIL Open Font License, bundled); see `.experience` in globals.css.
const cormorant = localFont({
  src: [
    { path: '../../../../fonts/CormorantGaramond-Variable.woff2', weight: '300 700', style: 'normal' },
    { path: '../../../../fonts/CormorantGaramond-Italic-Variable.woff2', weight: '300 700', style: 'italic' },
  ],
  variable: '--font-cormorant',
  display: 'swap',
})

const manrope = localFont({
  src: '../../../../fonts/Manrope-Variable.woff2',
  variable: '--font-manrope',
  weight: '200 800',
  display: 'swap',
})

export async function generateMetadata(): Promise<Metadata> {
  const [locale, p] = await Promise.all([getLocale(), getPages()])
  return pageMetadata({ locale, path: '/experience', title: p.experience.metaTitle, description: p.experience.metaDescription })
}

export default async function ExperiencePage() {
  const [t, p] = await Promise.all([getCommon(), getPages()])
  const e = p.experience

  // No preload for the film: Safari does not hand a preloaded file to fetch() and would download it
  // twice. The page shows the film's first frame straight away, and the film loads as the page starts.
  return (
    <div className={`experience ${cormorant.variable} ${manrope.variable}`}>
      <ExperienceFilm
        t={e.film}
        actions={
          <>
            <ButtonLink href="/booking" size="lg" arrow>
              {t.actions.book}
            </ButtonLink>
            <WhatsAppButton />
          </>
        }
      />

      <Section tone="light">
        <SectionHeading eyebrow={e.moments.eyebrow} title={e.moments.title} lead={e.moments.lead} />
        <ol className="grid gap-px overflow-hidden rounded-md border border-ink-900/10 bg-ink-900/10 sm:grid-cols-2">
          {e.moments.items.map((moment, index) => (
            <li key={moment.title} className="reveal bg-bone-50 p-8 sm:p-10">
              <span className="display text-5xl text-gold-600 lining-nums">{String(index + 1).padStart(2, '0')}</span>
              <h3 className="display mt-6 text-3xl text-ink-950 sm:text-[2.25rem]">{moment.title}</h3>
              <p className="mt-3 max-w-[46ch] text-[0.9375rem] leading-relaxed text-ink-900/70">{moment.text}</p>
            </li>
          ))}
        </ol>
      </Section>

      <Section tone="dark">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
          <div className="reveal relative aspect-[4/3] overflow-hidden rounded-2xl bg-ink-900 shadow-[0_40px_80px_-40px_rgba(0,0,0,0.6)] lg:aspect-[4/5]">
            <Photo src={FILM.interior} alt={e.car.imageAlt} sizes="(min-width: 1024px) 40vw, 100vw" className="object-[35%_center]" />
          </div>
          <div className="reveal">
            <Eyebrow onDark>{e.car.eyebrow}</Eyebrow>
            <h2 className="display mt-5 text-4xl text-bone-50 sm:text-5xl lg:text-[3.5rem]">
              <Accent text={e.car.title} />
            </h2>
            <div className="mt-6 space-y-5 text-lg leading-relaxed text-bone-100/70">
              {e.car.text.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
            <div className="mt-10">
              <ButtonLink href="/fleet" variant="outline-light" arrow>
                {e.car.link}
              </ButtonLink>
            </div>
          </div>
        </div>
      </Section>

      <CtaBand />
    </div>
  )
}
