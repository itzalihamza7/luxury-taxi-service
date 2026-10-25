import { BadgeCheck, CalendarClock, Check, Handshake, Languages, LockKeyhole, MapPin, PlaneLanding, Play, Quote, Tag, Wifi, type LucideIcon } from 'lucide-react'
import type { Metadata } from 'next'
import { Fragment, Suspense } from 'react'
import { QuickQuote } from '@/components/booking/QuickQuote'
import { ArticleCard, RouteCard, ServiceCard } from '@/components/content/Cards'
import { FaqList } from '@/components/content/FaqList'
import { JsonLd } from '@/components/content/JsonLd'
import { FleetGrid } from '@/components/fleet/FleetGrid'
import { contactDetails, WhatsAppButton } from '@/components/layout/ContactButtons'
import { CtaBand } from '@/components/layout/CtaBand'
import { Showroom } from '@/components/showroom/Showroom'
import { ShowroomStill } from '@/components/showroom/ShowroomStill'
import { ButtonLink } from '@/components/ui/Button'
import { Link } from '@/components/ui/Link'
import { Photo } from '@/components/ui/Photo'
import { Accent, Eyebrow, Section, SectionHeading } from '@/components/ui/Section'
import { site, siteUrl } from '@/content/site'
import { href } from '@/i18n/config'
import { getBooking, getCommon, getLocale, getPages } from '@/i18n/server'
import { pageMetadata } from '@/lib/seo'
import { loadCollection } from '@/lib/server-api'

const INCLUDED_ICONS: LucideIcon[] = [Handshake, Languages, Wifi, PlaneLanding, Tag, CalendarClock]
const STANDARD_ICONS: LucideIcon[] = [BadgeCheck, Languages, MapPin, LockKeyhole]

export async function generateMetadata(): Promise<Metadata> {
  const [locale, p] = await Promise.all([getLocale(), getPages()])
  return pageMetadata({ locale, path: '/', title: p.home.metaTitle, description: p.home.metaDescription })
}

/*
 * The sections below read what the operator manages in the console. Each one
 * streams in after the page frame, and is left out while it has nothing to show.
 */

/** Structured data for search engines, with the current phone number and email. */
async function BusinessData() {
  const [locale, p, settings] = await Promise.all([getLocale(), getPages(), contactDetails()])
  return (
    <JsonLd
      data={{
        '@context': 'https://schema.org',
        '@type': 'TaxiService',
        name: site.name,
        description: p.home.metaDescription,
        url: `${siteUrl}${href(locale)}`,
        ...(settings ? { telephone: settings.phone, email: settings.email } : {}),
        areaServed: [
          { '@type': 'City', name: 'Madrid' },
          { '@type': 'Country', name: 'Spain' },
        ],
        address: { '@type': 'PostalAddress', addressLocality: 'Madrid', addressCountry: 'ES' },
        openingHoursSpecification: { '@type': 'OpeningHoursSpecification', dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'], opens: '00:00', closes: '23:59' },
        availableLanguage: ['English', 'Spanish'],
      }}
    />
  )
}

async function ServicesSection() {
  const [services, locale, t, p] = await Promise.all([loadCollection('service'), getLocale(), getCommon(), getPages()])
  const h = p.home
  if (services.length === 0) return null
  return (
    <Section tone="bone">
      <SectionHeading eyebrow={h.servicesEyebrow} title={h.servicesTitle}>
        <ButtonLink href="/services" variant="outline" arrow>
          {t.nav.allServices}
        </ButtonLink>
      </SectionHeading>
      <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {services.map((service) => (
          <li key={service.slug} className="reveal">
            <ServiceCard service={service} locale={locale} t={t} />
          </li>
        ))}
        <li className="reveal">
          <div className="on-dark grain flex h-full flex-col justify-between rounded-md bg-ink-950 p-7 text-bone-100 sm:p-8">
            <div>
              <p className="eyebrow text-gold-300">{t.cta.eyebrow}</p>
              <p className="display mt-4 text-3xl text-bone-50">{h.widgetTitle}</p>
              <p className="mt-3 text-[0.9375rem] leading-relaxed text-bone-100/65">{h.widgetHint}</p>
            </div>
            <ButtonLink href="/booking" arrow className="mt-8 self-start">
              {t.actions.getPrice}
            </ButtonLink>
          </div>
        </li>
      </ul>
    </Section>
  )
}

async function RoutesSection() {
  const [routes, locale, t, p] = await Promise.all([loadCollection('route'), getLocale(), getCommon(), getPages()])
  const h = p.home
  if (routes.length === 0) return null
  return (
    <Section tone="light">
      <SectionHeading eyebrow={h.routesEyebrow} title={h.routesTitle}>
        <ButtonLink href="/routes" variant="outline" arrow>
          {t.actions.allRoutes}
        </ButtonLink>
      </SectionHeading>
      <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {routes.slice(0, 4).map((route) => (
          <li key={route.slug} className="reveal">
            <RouteCard route={route} locale={locale} t={t} />
          </li>
        ))}
      </ul>
    </Section>
  )
}

/** "Elena Ruiz" -> "ER": a reviewer's initials, for the badge beside their name. */
const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')

async function Reviews() {
  const [reviews, locale, p, settings] = await Promise.all([loadCollection('review'), getLocale(), getPages(), contactDetails()])
  const h = p.home
  // Sample reviews never reach the public: the section appears once the operator marks the reviews as real.
  if (reviews.length === 0 || settings?.reviewsAreSamples !== false) return null
  return (
    <div className="mt-24">
      <SectionHeading eyebrow={h.reviewsEyebrow} title={h.reviewsTitle} onDark />
      <ul className="grid gap-5 lg:grid-cols-3">
        {reviews.map((review) => (
          <li key={review.id} className="reveal">
            <figure className="flex h-full flex-col rounded-md border border-white/10 bg-white/[0.025] p-7">
              <Quote aria-hidden className="size-7 text-gold-300/70" />
              <blockquote className="mt-5 font-display text-[1.375rem] leading-snug text-bone-50">{review.quote[locale]}</blockquote>
              <figcaption className="mt-auto flex items-center gap-3.5 pt-7 text-sm">
                <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-full border border-gold-300/40 font-display text-base text-gold-300">
                  {initials(review.author[locale])}
                </span>
                <span>
                  <span className="block font-medium text-bone-50">{review.author[locale]}</span>
                  <span className="text-bone-100/55">{review.context[locale]}</span>
                </span>
              </figcaption>
            </figure>
          </li>
        ))}
      </ul>
    </div>
  )
}

async function FaqSection() {
  const [faqs, locale, t, p] = await Promise.all([loadCollection('faq'), getLocale(), getCommon(), getPages()])
  const h = p.home
  const featured = faqs.filter((faq) => faq.featured)
  if (featured.length === 0) return null
  return (
    <Section tone="light">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-20">
        <div className="reveal">
          <Eyebrow>{h.faqEyebrow}</Eyebrow>
          <h2 className="display mt-5 text-4xl sm:text-5xl lg:text-[3.5rem]">
            <Accent text={h.faqTitle} />
          </h2>
          <p className="mt-5 text-base leading-relaxed text-ink-900/65">{p.faq.lead}</p>
          <div className="mt-8">
            <ButtonLink href="/faq" variant="outline" arrow>
              {t.actions.allFaqs}
            </ButtonLink>
          </div>
        </div>
        <FaqList items={featured.map((faq) => ({ question: faq.question[locale], answer: faq.answer[locale] }))} />
      </div>
    </Section>
  )
}

async function JournalSection() {
  const [articles, locale, t, p] = await Promise.all([loadCollection('article'), getLocale(), getCommon(), getPages()])
  const h = p.home
  if (articles.length === 0) return null
  return (
    <Section tone="bone">
      <SectionHeading eyebrow={h.journalEyebrow} title={h.journalTitle}>
        <ButtonLink href="/journal" variant="outline" arrow>
          {t.actions.allArticles}
        </ButtonLink>
      </SectionHeading>
      <ul className="grid gap-5 lg:grid-cols-3">
        {articles.slice(0, 3).map((article) => (
          <li key={article.slug} className="reveal">
            <ArticleCard article={article} locale={locale} t={t} p={p} />
          </li>
        ))}
      </ul>
    </Section>
  )
}

export default async function HomePage() {
  const [t, p, b] = await Promise.all([getCommon(), getPages(), getBooking()])
  const h = p.home
  const promises = [t.promise.fixed, t.promise.cancel, t.promise.meet, t.promise.always]

  return (
    <>
      <Suspense fallback={null}>
        <BusinessData />
      </Suspense>

      <Showroom
        label={h.showroomLabel}
        scroll={h.showroomScroll}
        still={<ShowroomStill />}
        stages={[
          <Fragment key="opening">
            <Eyebrow onDark>{t.tagline}</Eyebrow>
            <h1 className="display mt-6 text-[3.25rem] leading-[0.95] text-bone-50 sm:text-7xl xl:text-[6.5rem]">
              <Accent text={h.heroTitle} />
            </h1>
            <p className="mt-6 max-w-lg text-base leading-relaxed text-bone-100/80 sm:text-lg">{h.heroLead}</p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <ButtonLink href="#quote" size="lg" arrow>
                {t.actions.getPrice}
              </ButtonLink>
              {/* Below 1024 px the bar at the bottom of the screen already offers WhatsApp; the space goes to the car. */}
              <span className="hidden lg:contents">
                <WhatsAppButton />
              </span>
            </div>
            {/* For visitors not ready to book: the film, one click away, on a line of its own. */}
            <Link
              href="/experience"
              className="group mt-7 inline-flex items-center gap-4 text-sm font-medium tracking-wide text-bone-50 transition-colors hover:text-gold-300"
            >
              <span className="relative flex size-12 shrink-0 items-center justify-center rounded-full bg-gold-400 text-ink-950 shadow-[0_10px_30px_-12px_rgba(212,182,126,0.8)] transition-transform duration-300 ease-out-expo group-hover:scale-105">
                <span aria-hidden className="absolute inset-0 animate-ping rounded-full border border-gold-300/50 [animation-duration:2.4s]" />
                <Play aria-hidden className="ml-0.5 size-4 fill-current" />
              </span>
              <span className="flex flex-col">
                {t.actions.watchExperience}
                <span className="text-xs font-normal tracking-normal text-bone-100/55">{t.nav.experienceHint}</span>
              </span>
            </Link>
          </Fragment>,
          <Fragment key="fleet">
            <Eyebrow onDark>{h.fleetStageEyebrow}</Eyebrow>
            <h2 className="display mt-6 text-5xl leading-[0.98] text-bone-50 sm:text-6xl xl:text-7xl">
              <Accent text={h.fleetStageTitle} />
            </h2>
            <p className="mt-6 max-w-md text-base leading-relaxed text-bone-100/75 sm:text-lg">{h.fleetStageText}</p>
            <div className="mt-8">
              <ButtonLink href="/fleet" variant="outline-light" arrow>
                {t.actions.viewFleet}
              </ButtonLink>
            </div>
          </Fragment>,
          <Fragment key="ride">
            <Eyebrow onDark>{h.rideStageEyebrow}</Eyebrow>
            <h2 className="display mt-6 text-5xl leading-[0.98] text-bone-50 sm:text-6xl xl:text-7xl">
              <Accent text={h.rideStageTitle} />
            </h2>
            <p className="mt-6 max-w-md text-base leading-relaxed text-bone-100/75 sm:text-lg">{h.rideStageText}</p>
            <div className="mt-8">
              <ButtonLink href="#quote" size="lg" arrow>
                {t.actions.getPrice}
              </ButtonLink>
            </div>
          </Fragment>,
        ]}
      />

      {/* The price, straight after the showroom. */}
      <Section tone="dark" id="quote">
        <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,1fr)_26rem] lg:gap-16 xl:grid-cols-[minmax(0,1fr)_28rem]">
          <div className="reveal">
            <Eyebrow onDark>{t.cta.eyebrow}</Eyebrow>
            <h2 className="display mt-5 text-5xl text-bone-50 sm:text-6xl lg:text-7xl">{h.widgetTitle}</h2>
            <p className="mt-5 max-w-lg text-base leading-relaxed text-bone-100/70 sm:text-lg">{h.widgetHint}</p>
            <ul className="mt-10 grid max-w-xl gap-x-8 gap-y-3 text-sm text-bone-100/75 sm:grid-cols-2">
              {promises.map((promise) => (
                <li key={promise} className="flex items-start gap-2.5">
                  <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-gold-300" />
                  {promise}
                </li>
              ))}
            </ul>
          </div>
          {/* min-w-0 lets this column shrink to the screen: the row of ride types scrolls instead of widening the page. */}
          <div className="min-w-0">
            <QuickQuote b={b} />
          </div>
        </div>
      </Section>

      {/* In short */}
      <Section tone="light">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
          <div className="reveal group relative aspect-[4/3] overflow-hidden rounded-2xl bg-ink-900 shadow-[0_40px_80px_-40px_rgba(12,18,27,0.45)]">
            <Photo src="/images/site/chauffeur-door.jpg" alt={h.introImageAlt} sizes="(min-width: 1024px) 50vw, 100vw" className="transition-transform duration-[1600ms] ease-out-expo group-hover:scale-[1.03]" />
          </div>
          <div className="reveal">
            <Eyebrow>{h.introEyebrow}</Eyebrow>
            <h2 className="display mt-5 text-4xl sm:text-5xl lg:text-[3.5rem]">
              <Accent text={h.introTitle} />
            </h2>
            <p className="mt-6 max-w-2xl text-base leading-relaxed text-ink-900/70 sm:text-lg">{h.introText}</p>
            <dl className="mt-9 grid gap-6 border-t border-ink-900/10 pt-8 sm:grid-cols-3">
              {h.facts.map((fact) => (
                <div key={fact.label}>
                  <dd className="font-display text-5xl text-gold-600">{fact.value}</dd>
                  <dt className="mt-2 text-sm leading-relaxed text-ink-900/65">{fact.label}</dt>
                </div>
              ))}
            </dl>
            <div className="mt-9">
              <ButtonLink href="/about" variant="outline" arrow>
                {t.nav.about}
              </ButtonLink>
            </div>
          </div>
        </div>
      </Section>

      {/* The experience: the film, offered to everyone who is not ready to book yet. */}
      <Section tone="dark">
        <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:gap-16">
          {/* The whole picture opens the film for pointer users; keyboard and screen readers use the button beside it. */}
          <Link
            href="/experience"
            tabIndex={-1}
            aria-hidden
            className="reveal group relative block aspect-[16/10] overflow-hidden rounded-2xl bg-ink-900 shadow-[0_40px_80px_-40px_rgba(0,0,0,0.7)]"
          >
            <Photo
              src="/video/maybach-poster.jpg"
              alt=""
              sizes="(min-width: 1024px) 58vw, 100vw"
              className="object-[25%_center] transition-transform duration-[1600ms] ease-out-expo group-hover:scale-[1.04]"
            />
            <span className="absolute inset-0 bg-gradient-to-t from-ink-950/75 via-ink-950/10 to-ink-950/20" />
            <span className="absolute left-1/2 top-1/2 flex size-20 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-gold-300/80 bg-ink-950/35 backdrop-blur-sm transition-transform duration-500 ease-out-expo group-hover:scale-110 sm:size-24">
              <span className="absolute inset-0 animate-ping rounded-full border border-gold-300/50 [animation-duration:2.4s]" />
              <Play className="ml-1 size-7 fill-gold-300 text-gold-300 sm:size-8" />
            </span>
          </Link>
          <div className="reveal">
            <Eyebrow onDark>{h.experienceEyebrow}</Eyebrow>
            <h2 className="display mt-5 text-4xl text-bone-50 sm:text-5xl lg:text-[3.5rem]">
              <Accent text={h.experienceTitle} />
            </h2>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-bone-100/70 sm:text-lg">{h.experienceText}</p>
            <div className="mt-9 flex flex-wrap items-center gap-4">
              <ButtonLink href="/experience" size="lg" arrow>
                {t.actions.watchExperience}
              </ButtonLink>
              <ButtonLink href="/booking" variant="outline-light" size="lg">
                {t.actions.book}
              </ButtonLink>
            </div>
          </div>
        </div>
      </Section>

      <Suspense fallback={null}>
        <ServicesSection />
      </Suspense>

      {/* Fleet */}
      <Section tone="dark">
        <SectionHeading eyebrow={h.fleetEyebrow} title={h.fleetTitle} lead={h.fleetLead} onDark>
          <ButtonLink href="/fleet" variant="outline-light" arrow>
            {t.actions.viewFleet}
          </ButtonLink>
        </SectionHeading>
        <FleetGrid limit={6} />
      </Section>

      {/* Included with every ride */}
      <Section tone="light">
        <SectionHeading eyebrow={h.includedEyebrow} title={h.includedTitle} />
        <ul className="grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {h.included.map((item, index) => {
            const Icon = INCLUDED_ICONS[index] ?? Check
            return (
              <li key={item.title} className="reveal flex gap-5">
                <span className="flex size-12 shrink-0 items-center justify-center rounded-full border border-gold-600/30 text-gold-700">
                  <Icon aria-hidden strokeWidth={1.25} className="size-5" />
                </span>
                <div>
                  <h3 className="font-display text-2xl">{item.title}</h3>
                  <p className="mt-2 text-[0.9375rem] leading-relaxed text-ink-900/65">{item.text}</p>
                </div>
              </li>
            )
          })}
        </ul>
      </Section>

      {/* How it works */}
      <Section tone="bone">
        <SectionHeading eyebrow={h.stepsEyebrow} title={h.stepsTitle} align="center" />
        <ol className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {h.steps.map((step, index) => (
            <li key={step.title} className="reveal relative border-t border-ink-900/15 pt-6">
              <span className="font-display text-5xl text-gold-600/70">{String(index + 1).padStart(2, '0')}</span>
              <h3 className="mt-4 font-display text-2xl">{step.title}</h3>
              <p className="mt-2 text-[0.9375rem] leading-relaxed text-ink-900/65">{step.text}</p>
            </li>
          ))}
        </ol>
        <div className="mt-12 flex justify-center">
          <ButtonLink href="/booking" variant="dark" size="lg" arrow>
            {t.actions.book}
          </ButtonLink>
        </div>
      </Section>

      <Suspense fallback={null}>
        <RoutesSection />
      </Suspense>

      {/* Chauffeur standards + reviews */}
      <Section tone="dark">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,0.75fr)_minmax(0,1.25fr)] lg:gap-16">
          <div className="reveal relative aspect-[4/3] overflow-hidden rounded-2xl bg-ink-900 lg:aspect-auto lg:min-h-[34rem]">
            <Photo src="/images/site/chauffeur-coat.jpg" alt={h.standardsImageAlt} sizes="(min-width: 1024px) 40vw, 100vw" className="object-[50%_30%]" />
            <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-ink-950/60 via-transparent to-transparent" />
          </div>
          <div>
            <SectionHeading eyebrow={h.standardsEyebrow} title={h.standardsTitle} onDark />
            <ul className="grid gap-px overflow-hidden rounded-xl border border-white/10 bg-white/10 sm:grid-cols-2">
              {h.standards.map((standard, index) => {
                const Icon = STANDARD_ICONS[index] ?? Check
                return (
                  <li key={standard.title} className="reveal bg-ink-950 p-7">
                    <Icon aria-hidden strokeWidth={1.25} className="size-7 text-gold-300" />
                    <h3 className="mt-6 font-display text-2xl text-bone-50">{standard.title}</h3>
                    <p className="mt-2 text-[0.9375rem] leading-relaxed text-bone-100/65">{standard.text}</p>
                  </li>
                )
              })}
            </ul>
          </div>
        </div>

        <Suspense fallback={null}>
          <Reviews />
        </Suspense>
      </Section>

      <Suspense fallback={null}>
        <FaqSection />
      </Suspense>

      <Suspense fallback={null}>
        <JournalSection />
      </Suspense>

      <CtaBand />
    </>
  )
}
