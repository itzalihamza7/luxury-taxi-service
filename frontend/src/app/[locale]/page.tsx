import { BadgeCheck, CalendarClock, Check, Handshake, Languages, LockKeyhole, MapPin, MessageCircle, PlaneLanding, Quote, Tag, Wifi, type LucideIcon } from 'lucide-react'
import type { Metadata } from 'next'
import { Backdrop } from '@/components/art/Backdrop'
import { QuickQuote } from '@/components/booking/QuickQuote'
import { ArticleCard, RouteCard, ServiceCard } from '@/components/content/Cards'
import { FaqList } from '@/components/content/FaqList'
import { JsonLd } from '@/components/content/JsonLd'
import { FleetGrid } from '@/components/fleet/FleetGrid'
import { CtaBand } from '@/components/layout/CtaBand'
import { ButtonLink } from '@/components/ui/Button'
import { Accent, Eyebrow, Section, SectionHeading } from '@/components/ui/Section'
import { faqs } from '@/content/faq'
import { articles } from '@/content/journal'
import { routes } from '@/content/routes'
import { services } from '@/content/services'
import { site, siteUrl, whatsappHref } from '@/content/site'
import { testimonials } from '@/content/testimonials'
import { href } from '@/i18n/config'
import { getBooking, getCommon, getLocale, getPages } from '@/i18n/server'
import { pageMetadata } from '@/lib/seo'

const INCLUDED_ICONS: LucideIcon[] = [Handshake, Languages, Wifi, PlaneLanding, Tag, CalendarClock]
const STANDARD_ICONS: LucideIcon[] = [BadgeCheck, Languages, MapPin, LockKeyhole]

export async function generateMetadata(): Promise<Metadata> {
  const [locale, p] = await Promise.all([getLocale(), getPages()])
  return pageMetadata({ locale, path: '/', title: p.home.metaTitle, description: p.home.metaDescription })
}

export default async function HomePage() {
  const [locale, t, p, b] = await Promise.all([getLocale(), getCommon(), getPages(), getBooking()])
  const h = p.home
  const promises = [t.promise.fixed, t.promise.cancel, t.promise.meet, t.promise.always]

  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'TaxiService',
          name: `${site.name} ${site.descriptor}`,
          description: h.metaDescription,
          url: `${siteUrl}${href(locale)}`,
          telephone: site.phone,
          email: site.email,
          areaServed: [
            { '@type': 'City', name: 'Madrid' },
            { '@type': 'Country', name: 'Spain' },
          ],
          address: { '@type': 'PostalAddress', addressLocality: 'Madrid', addressCountry: 'ES' },
          openingHoursSpecification: { '@type': 'OpeningHoursSpecification', dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'], opens: '00:00', closes: '23:59' },
          availableLanguage: ['English', 'Spanish'],
        }}
      />

      {/* Hero */}
      <section className="on-dark grain relative bg-ink-950 pb-20 pt-32 text-bone-100 sm:pt-40 lg:min-h-dvh lg:pb-28">
        <Backdrop variant="home" />
        <div className="container-page relative grid items-center gap-12 lg:grid-cols-[minmax(0,1fr)_26rem] lg:gap-16 xl:grid-cols-[minmax(0,1fr)_28rem]">
          <div className="min-w-0 animate-rise">
            <Eyebrow onDark>{t.tagline}</Eyebrow>
            <h1 className="display mt-6 text-[3.5rem] leading-[0.95] text-bone-50 sm:text-8xl xl:text-[7.5rem]">
              <Accent text={h.heroTitle} />
            </h1>
            <p className="mt-7 max-w-xl text-lg leading-relaxed text-bone-100/70 sm:text-xl">{h.heroLead}</p>
            <div className="mt-9 flex flex-wrap items-center gap-4">
              <ButtonLink href="/booking" size="lg" arrow className="lg:hidden">
                {t.actions.getPrice}
              </ButtonLink>
              <ButtonLink href={whatsappHref()} variant="outline-light" size="lg">
                <MessageCircle aria-hidden className="size-4" />
                {t.actions.whatsapp}
              </ButtonLink>
              <ButtonLink href="/fleet" variant="ghost" arrow className="text-bone-100/80">
                {t.actions.viewFleet}
              </ButtonLink>
            </div>
            <ul className="mt-12 grid max-w-xl gap-x-8 gap-y-3 text-sm text-bone-100/65 sm:grid-cols-2">
              {promises.map((promise) => (
                <li key={promise} className="flex items-start gap-2.5">
                  <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-gold-300" />
                  {promise}
                </li>
              ))}
            </ul>
          </div>

          {/* min-w-0 lets this column shrink to the screen: the row of ride types scrolls instead of widening the page. */}
          <div id="quote" className="min-w-0 animate-rise scroll-mt-28 [animation-delay:150ms]">
            <h2 className="mb-4 flex items-baseline justify-between gap-4">
              <span className="font-display text-3xl text-bone-50">{h.widgetTitle}</span>
              <span className="text-xs text-bone-100/55">{h.widgetHint}</span>
            </h2>
            <QuickQuote b={b} />
          </div>
        </div>
      </section>

      {/* In short */}
      <Section tone="light">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-20">
          <div className="reveal">
            <Eyebrow>{h.introEyebrow}</Eyebrow>
            <h2 className="display mt-5 text-4xl sm:text-5xl lg:text-[3.5rem]">
              <Accent text={h.introTitle} />
            </h2>
            <p className="mt-6 max-w-2xl text-base leading-relaxed text-ink-900/70 sm:text-lg">{h.introText}</p>
            <div className="mt-8">
              <ButtonLink href="/about" variant="outline" arrow>
                {t.nav.about}
              </ButtonLink>
            </div>
          </div>
          <dl className="reveal divide-y divide-ink-900/10 border-y border-ink-900/10">
            {h.facts.map((fact) => (
              <div key={fact.label} className="flex items-baseline gap-6 py-6">
                <dt className="order-2 text-[0.9375rem] leading-relaxed text-ink-900/65">{fact.label}</dt>
                <dd className="order-1 w-28 shrink-0 font-display text-5xl text-gold-600 sm:w-32 sm:text-6xl">{fact.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </Section>

      {/* Services */}
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

      {/* Routes */}
      <Section tone="light">
        <SectionHeading eyebrow={h.routesEyebrow} title={h.routesTitle}>
          <ButtonLink href="/routes" variant="outline" arrow>
            {t.actions.allRoutes}
          </ButtonLink>
        </SectionHeading>
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {routes.map((route) => (
            <li key={route.slug} className="reveal">
              <RouteCard route={route} locale={locale} t={t} />
            </li>
          ))}
        </ul>
      </Section>

      {/* Chauffeur standards + reviews */}
      <Section tone="dark">
        <SectionHeading eyebrow={h.standardsEyebrow} title={h.standardsTitle} onDark />
        <ul className="grid gap-px overflow-hidden rounded-md border border-white/10 bg-white/10 sm:grid-cols-2 lg:grid-cols-4">
          {h.standards.map((standard, index) => {
            const Icon = STANDARD_ICONS[index] ?? Check
            return (
              <li key={standard.title} className="reveal bg-ink-950 p-7">
                <Icon aria-hidden strokeWidth={1.25} className="size-7 text-gold-300" />
                <h3 className="mt-6 font-display text-2xl text-bone-50">{standard.title}</h3>
                <p className="mt-2 text-[0.9375rem] leading-relaxed text-bone-100/60">{standard.text}</p>
              </li>
            )
          })}
        </ul>

        <div className="mt-24">
          <SectionHeading eyebrow={h.reviewsEyebrow} title={h.reviewsTitle} onDark />
          <ul className="grid gap-5 lg:grid-cols-3">
            {testimonials.map((review) => (
              <li key={review.quote.en} className="reveal">
                <figure className="flex h-full flex-col rounded-md border border-white/10 bg-white/[0.025] p-7">
                  <Quote aria-hidden className="size-7 text-gold-300/70" />
                  <blockquote className="mt-5 font-display text-[1.375rem] leading-snug text-bone-50">{review.quote[locale]}</blockquote>
                  <figcaption className="mt-auto pt-7 text-sm">
                    <span className="block font-medium text-bone-50">{review.author[locale]}</span>
                    <span className="text-bone-100/55">{review.context[locale]}</span>
                  </figcaption>
                </figure>
              </li>
            ))}
          </ul>
          {site.testimonialsAreSamples ? <p className="mt-5 text-xs text-bone-100/55">{h.reviewsSample}</p> : null}
        </div>
      </Section>

      {/* FAQ */}
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
          <FaqList items={faqs.filter((faq) => faq.featured).map((faq) => ({ question: faq.question[locale], answer: faq.answer[locale] }))} />
        </div>
      </Section>

      {/* Journal */}
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

      <CtaBand />
    </>
  )
}
