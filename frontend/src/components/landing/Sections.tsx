'use client'

import { useEffect, useRef, type FormEvent } from 'react'
import { reportWhatsAppClick } from '@/components/layout/WhatsAppTracker'
import { Link } from '@/components/ui/Link'
import { site } from '@/content/site'
import { fill, href, type Locale } from '@/i18n/config'
import type { LandingMessages } from '@/i18n/messages/landing'
import { emailHref, phoneHref, whatsappHref } from '@/lib/contact'
import { clamp, useFrame } from './engine'
import { Eyebrow, Headline } from './type'
import { INTERIOR } from './Drive'

const gutter = 'px-6 sm:px-10 lg:px-16'

/**
 * Fades and lifts the `.l-reveal` items inside `ref` once it is a fifth in
 * view, 120 ms apart. Without motion they are simply there.
 */
function useReveal(ref: React.RefObject<HTMLElement | null>, still: boolean) {
  useEffect(() => {
    const element = ref.current
    if (!element) return
    if (still) {
      element.dataset.shown = 'true'
      element.dataset.settled = 'true'
      return
    }
    let settle: number | undefined
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return
        element.dataset.shown = 'true'
        observer.disconnect()
        settle = window.setTimeout(() => (element.dataset.settled = 'true'), 1600)
      },
      { threshold: 0.2 },
    )
    observer.observe(element)
    return () => {
      observer.disconnect()
      window.clearTimeout(settle)
    }
  }, [ref, still])
}

const stagger = (index: number) => ({ transitionDelay: `${index * 120}ms` })

export function Services({ t, still }: { t: LandingMessages['services']; still: boolean }) {
  const grid = useRef<HTMLUListElement>(null)
  useReveal(grid, still)
  return (
    <section id="services" className={`relative z-10 bg-[var(--ink)] py-28 sm:py-36 ${gutter}`}>
      <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Eyebrow className="text-[var(--champagne)]">{t.eyebrow}</Eyebrow>
          <Headline lines={t.lines} className="mt-5 text-[clamp(40px,5.5vw,80px)] leading-[1]" />
        </div>
        <p className="hidden max-w-[42ch] text-[16px] leading-relaxed text-[var(--ivory-muted)] lg:block">{t.lead}</p>
      </div>
      <ul ref={grid} className="l-reveal-group mt-16 grid gap-px bg-[rgba(244,238,227,0.1)] sm:mt-20 md:grid-cols-2 lg:grid-cols-4">
        {t.items.map((item, index) => (
          <li key={item.title} className="l-reveal group flex min-h-[320px] flex-col justify-between bg-[var(--ink)] p-8 hover:bg-[#16120D] lg:p-10" style={stagger(index)}>
            <span className="l-eyebrow text-[var(--champagne)]">{String(index + 1).padStart(2, '0')}</span>
            <div>
              <h3 className="l-display text-[30px] leading-[1.1] transition-transform duration-500 group-hover:translate-x-1.5">{item.title}</h3>
              <p className="mt-4 text-[15px] leading-relaxed text-[var(--ivory-muted)]">{item.text}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}

export function TheCar({ t, still }: { t: LandingMessages['car']; still: boolean }) {
  const block = useRef<HTMLDivElement>(null)
  const frame = useRef<HTMLDivElement>(null)
  const image = useRef<HTMLImageElement>(null)
  useReveal(block, still)

  // A slow parallax: the picture drifts from -4% to 4% as its frame crosses the screen.
  useFrame(() => {
    const wrapper = frame.current
    const picture = image.current
    if (still || !wrapper || !picture) return
    const rect = wrapper.getBoundingClientRect()
    if (rect.bottom < 0 || rect.top > window.innerHeight) return
    const progress = clamp((window.innerHeight - rect.top) / (window.innerHeight + rect.height))
    picture.style.transform = `translateY(${(-4 + 8 * progress).toFixed(2)}%) scale(1.12)`
  })

  return (
    <section id="car" className={`bg-[var(--ink)] pb-28 sm:pb-36 ${gutter}`}>
      <div ref={block} className="l-reveal-group grid items-center gap-16 lg:grid-cols-2 lg:gap-24">
        <div ref={frame} className="l-reveal relative aspect-[4/5] overflow-hidden rounded-[4px]" style={stagger(0)}>
          {/* eslint-disable-next-line @next/next/no-img-element -- a still from the film, moved by the parallax */}
          <img ref={image} src={INTERIOR} alt={t.imageAlt} loading="lazy" decoding="async" className="absolute inset-0 size-full object-cover object-[35%_center] will-change-transform" style={{ transform: 'translateY(-4%) scale(1.12)' }} />
        </div>
        <div className="l-reveal" style={stagger(1)}>
          <Eyebrow className="text-[var(--champagne)]">{t.eyebrow}</Eyebrow>
          <Headline lines={t.lines} className="mt-5 text-[clamp(40px,5vw,72px)] leading-[1]" />
          <p className="mt-6 max-w-[44ch] text-[16px] leading-relaxed text-[var(--ivory-muted)]">{t.text}</p>
          <dl className="mt-10">
            {t.specs.map((spec) => (
              <div key={spec.label} className="flex items-baseline justify-between gap-6 border-t border-[rgba(244,238,227,0.12)] py-4">
                <dt className="l-eyebrow text-[var(--ivory-muted)]">{spec.label}</dt>
                <dd className="text-right text-[16px] text-[var(--ivory)]">{spec.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  )
}

interface Contact {
  phone: string | null
  whatsapp: string | null
  email: string | null
}

const field = 'w-full rounded-none border-0 border-b border-[rgba(14,11,8,0.2)] bg-transparent py-3 text-[17px] text-[var(--ink)] outline-none transition-colors duration-300 focus:border-[var(--ink)]'
const label = 'l-eyebrow mb-1 block text-[rgba(14,11,8,0.55)]'

export function Booking({ t, contact, locale }: { t: LandingMessages['booking']; contact: Contact; locale: Locale }) {
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = event.currentTarget
    if (!form.checkValidity()) {
      form.reportValidity()
      return
    }
    const data = new FormData(form)
    const value = (name: string) => String(data.get(name) ?? '').trim()
    const f = t.fields
    const lines = [
      `${t.message} — ${site.name}`,
      '',
      `${f.pickup}: ${value('pickup')}`,
      `${f.dropoff}: ${value('dropoff')}`,
      `${f.date}: ${value('date')}`,
      `${f.time}: ${value('time')}`,
      `${f.service}: ${value('service')}`,
      `${f.passengers}: ${value('passengers')}`,
      `${f.name}: ${value('name')}`,
      `${f.phone}: ${value('phone')}`,
      ...(value('notes') ? [`${f.notes}: ${value('notes')}`] : []),
    ]
    // Without the business details (the API is unreachable), the contact page still offers a way through.
    if (!contact.whatsapp) {
      window.location.assign(href(locale, '/contact'))
      return
    }
    reportWhatsAppClick()
    window.open(whatsappHref(contact.whatsapp, lines.join('\n')), '_blank', 'noopener,noreferrer')
  }

  const f = t.fields
  return (
    <section id="booking" className={`bg-[var(--ivory)] py-28 text-[var(--ink)] sm:py-36 ${gutter}`}>
      <div className="grid gap-16 lg:grid-cols-12 lg:gap-20">
        <div className="lg:col-span-5">
          <Eyebrow className="text-[#8A6F4A]">{t.eyebrow}</Eyebrow>
          <Headline lines={t.lines} className="mt-5 text-[clamp(40px,5.5vw,80px)] leading-[1]" />
          <p className="mt-6 max-w-[44ch] text-[16px] leading-relaxed text-[rgba(14,11,8,0.7)]">{t.text}</p>
          <ul className="mt-10 space-y-2 text-[16px]">
            {contact.phone ? (
              <li>
                <a href={phoneHref(contact.phone)} className="transition-colors duration-300 hover:text-[#8A6F4A]">
                  {contact.phone}
                </a>
              </li>
            ) : null}
            {contact.email ? (
              <li>
                <a href={emailHref(contact.email)} className="transition-colors duration-300 hover:text-[#8A6F4A]">
                  {contact.email}
                </a>
              </li>
            ) : null}
            <li>{t.city}</li>
          </ul>
        </div>

        <form onSubmit={submit} noValidate className="grid gap-x-8 gap-y-8 sm:grid-cols-2 lg:col-span-7">
          <label className="sm:col-span-2">
            <span className={label}>{f.pickup}</span>
            <input name="pickup" required autoComplete="off" className={field} />
          </label>
          <label className="sm:col-span-2">
            <span className={label}>{f.dropoff}</span>
            <input name="dropoff" required autoComplete="off" className={field} />
          </label>
          <label>
            <span className={label}>{f.date}</span>
            <input name="date" type="date" required className={field} />
          </label>
          <label>
            <span className={label}>{f.time}</span>
            <input name="time" type="time" required className={field} />
          </label>
          <label>
            <span className={label}>{f.service}</span>
            <select name="service" className={`${field} cursor-pointer`}>
              {t.services.map((service) => (
                <option key={service}>{service}</option>
              ))}
            </select>
          </label>
          <label>
            <span className={label}>{f.passengers}</span>
            <select name="passengers" className={`${field} cursor-pointer`}>
              {['1', '2', '3'].map((count) => (
                <option key={count}>{count}</option>
              ))}
            </select>
          </label>
          <label>
            <span className={label}>{f.name}</span>
            <input name="name" required autoComplete="name" className={field} />
          </label>
          <label>
            <span className={label}>{f.phone}</span>
            <input name="phone" type="tel" required autoComplete="tel" className={field} />
          </label>
          <label className="sm:col-span-2">
            <span className={label}>{f.notes}</span>
            <textarea name="notes" rows={2} className={`${field} resize-none`} />
          </label>
          <div className="sm:col-span-2">
            <button type="submit" className="w-full rounded-full bg-[var(--ink)] px-9 py-4 text-[14px] tracking-[0.08em] text-[var(--ivory)] transition-colors duration-300 hover:bg-[#2A221A] sm:w-auto">
              {t.submit}
            </button>
            <p className="mt-4 text-[13px] text-[rgba(14,11,8,0.55)]">{t.note}</p>
          </div>
        </form>
      </div>
    </section>
  )
}

interface FooterContact extends Contact {
  instagram: string | null
}

export function Footer({ t, contact, year }: { t: LandingMessages['footer']; contact: FooterContact; year: number }) {
  const quiet = 'text-[13px] text-[var(--ivory-muted)] transition-colors duration-300 hover:text-[var(--ivory)]'
  return (
    <footer id="contact" className={`bg-[var(--ink)] pb-10 pt-24 ${gutter}`}>
      {/* The name, as wide as the page. */}
      <p aria-hidden className="l-display whitespace-nowrap text-[length:var(--wordmark-size)] leading-none tracking-[0.08em] text-[rgba(244,238,227,0.9)] uppercase">
        {site.name}
      </p>
      <div className="mt-16 flex flex-col gap-6 border-t border-[rgba(244,238,227,0.1)] pt-8 md:flex-row md:items-center md:justify-between">
        <p className="text-[13px] text-[var(--ivory-muted)]">{fill(t.rights, { year })}</p>
        <div className="flex flex-wrap gap-x-8 gap-y-3">
          {contact.instagram ? (
            <a href={contact.instagram} target="_blank" rel="noopener noreferrer" className={quiet}>
              {t.instagram}
            </a>
          ) : null}
          {contact.whatsapp ? (
            <a href={whatsappHref(contact.whatsapp)} target="_blank" rel="noopener noreferrer" className={quiet}>
              {t.whatsapp}
            </a>
          ) : null}
          {contact.email ? (
            <a href={emailHref(contact.email)} className={quiet}>
              {contact.email}
            </a>
          ) : null}
        </div>
      </div>
      {/* The rest of the site, and the legal pages every Spanish website must link to. */}
      <nav aria-label={t.more} className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-[12px] text-[rgba(244,238,227,0.5)]">
        <Link href="/fleet" className="transition-colors duration-300 hover:text-[var(--ivory)]">
          {t.links.fleet}
        </Link>
        <Link href="/booking" className="transition-colors duration-300 hover:text-[var(--ivory)]">
          {t.links.online}
        </Link>
        <Link href="/booking/track" className="transition-colors duration-300 hover:text-[var(--ivory)]">
          {t.links.track}
        </Link>
        <Link href="/account" className="transition-colors duration-300 hover:text-[var(--ivory)]">
          {t.links.account}
        </Link>
        <span aria-hidden className="hidden opacity-40 sm:inline">
          ·
        </span>
        <Link href="/legal/legal-notice" className="transition-colors duration-300 hover:text-[var(--ivory)]">
          {t.legal.notice}
        </Link>
        <Link href="/legal/privacy" className="transition-colors duration-300 hover:text-[var(--ivory)]">
          {t.legal.privacy}
        </Link>
        <Link href="/legal/cookies" className="transition-colors duration-300 hover:text-[var(--ivory)]">
          {t.legal.cookies}
        </Link>
        <Link href="/legal/terms" className="transition-colors duration-300 hover:text-[var(--ivory)]">
          {t.legal.terms}
        </Link>
      </nav>
    </footer>
  )
}
