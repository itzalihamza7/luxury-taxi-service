import type { Locale } from '@/i18n/config'
import type { CommonMessages } from '@/i18n/messages/common'
import type { ManageMessages } from '@/i18n/messages/manage'
import { RIDE_TYPES, type Collection } from '@/lib/types'
import { heading, type Draft, type FieldDef } from './EntryForm'

/*
 * What each form in the console contains. The field paths match what the API
 * expects, so the errors it sends back land on the right field.
 */

interface Option {
  value: string
  label: string
}

/** Lists the forms offer to choose from, loaded once from the API. */
export interface Choices {
  vehicles: Option[]
  places: Option[]
}

const CATEGORIES = ['economy', 'sedan', 'van', 'group', 'flagship'] as const
const BODY_TYPES = ['hatchback', 'sedan', 'limousine', 'van', 'minibus'] as const
const ICONS = ['plane', 'clock', 'city', 'route', 'map'] as const

const empty = { en: '', es: '' }
const emptyList = { en: [], es: [] }

export function vehicleFields(m: ManageMessages, t: CommonMessages): FieldDef[] {
  const f = m.fleet
  return [
    { kind: 'text', path: 'name', label: f.name },
    { kind: 'select', path: 'category', label: f.category, options: CATEGORIES.map((value) => ({ value, label: t.categories[value] })) },
    { kind: 'number', path: 'passengers', label: f.passengers, min: 1 },
    { kind: 'number', path: 'luggage', label: f.luggage, min: 0 },
    { kind: 'image', path: 'imageUrl', label: f.photo },
    { kind: 'select', path: 'bodyType', label: f.bodyType, hint: f.bodyTypeHint, options: BODY_TYPES.map((value) => ({ value, label: f.bodyTypes[value] })) },
    { kind: 'text', path: 'tagline', label: f.tagline, localized: true },
    { kind: 'text', path: 'description', label: f.description, localized: true, multiline: true, rows: 4 },
    { kind: 'lines', path: 'highlights', label: f.highlights, hint: m.hints.lines, rows: 4 },
    heading(f.prices, f.pricesHint),
    { kind: 'money', path: 'baseFareCents', label: f.baseFare },
    { kind: 'money', path: 'perKmCents', label: f.perKm },
    { kind: 'money', path: 'minFareCents', label: f.minFare },
    { kind: 'money', path: 'hourlyRateCents', label: f.hourly },
    heading(m.shown),
    { kind: 'number', path: 'sortOrder', label: m.position, hint: m.positionHint, min: 0 },
    { kind: 'text', path: 'slug', label: m.slug, hint: m.slugHint },
    { kind: 'boolean', path: 'active', label: m.shown },
  ]
}

export const blankVehicle = (sortOrder: number): Draft => ({
  slug: '',
  name: '',
  category: 'sedan',
  bodyType: 'sedan',
  passengers: 3,
  luggage: 2,
  baseFareCents: null,
  perKmCents: null,
  hourlyRateCents: null,
  minFareCents: null,
  tagline: empty,
  description: empty,
  highlights: emptyList,
  imageUrl: null,
  sortOrder,
  active: true,
})

/** Where the entry appears, and whether it is shown at all. */
function placement(m: ManageMessages, hasPage: boolean): FieldDef[] {
  return [
    heading(m.shown),
    { kind: 'number', path: 'sortOrder', label: m.position, hint: m.positionHint, min: 0 },
    ...(hasPage ? [{ kind: 'text', path: 'slug', label: m.slug, hint: m.slugHint } satisfies FieldDef] : []),
    { kind: 'boolean', path: 'published', label: m.shown },
  ]
}

export function contentFields(collection: Collection, m: ManageMessages, t: CommonMessages, choices: Choices): FieldDef[] {
  const c = m.content
  const title: FieldDef = { kind: 'text', path: 'data.title', label: c.title, localized: true }
  const summary: FieldDef = { kind: 'text', path: 'data.summary', label: c.summary, hint: c.summaryHint, localized: true, multiline: true }
  const pageHeading: FieldDef = { kind: 'text', path: 'data.heading', label: c.heading, hint: m.hints.accent, localized: true }
  const picture: FieldDef = { kind: 'image', path: 'data.image', label: c.picture }
  const vehicles: FieldDef = { kind: 'choices', path: 'data.vehicles', label: c.vehicles, options: choices.vehicles }
  const questions: FieldDef = { kind: 'questions', path: 'data.faqs', label: c.questions, hint: m.hints.questions, rows: 10 }
  const place = (path: string): FieldDef => ({ kind: 'select', path, label: c.place, hint: c.placeHint, options: choices.places, empty: m.none })

  switch (collection) {
    case 'service':
      return [
        title,
        summary,
        pageHeading,
        { kind: 'select', path: 'data.rideType', label: c.rideType, hint: c.rideTypeHint, options: RIDE_TYPES.map((value) => ({ value, label: t.rideTypes[value] })) },
        { kind: 'select', path: 'data.icon', label: c.icon, options: ICONS.map((value) => ({ value, label: c.icons[value] })) },
        picture,
        { kind: 'paragraphs', path: 'data.intro', label: c.intro, hint: m.hints.paragraphs, rows: 8 },
        { kind: 'lines', path: 'data.includes', label: c.includes, hint: m.hints.lines },
        { kind: 'lines', path: 'data.idealFor', label: c.idealFor, hint: m.hints.lines },
        vehicles,
        questions,
        ...placement(m, true),
      ]
    case 'route':
      return [
        { kind: 'text', path: 'data.city', label: c.city, localized: true },
        { kind: 'number', path: 'data.km', label: c.km, min: 1 },
        { kind: 'number', path: 'data.minutes', label: c.minutes, min: 1 },
        { kind: 'text', path: 'data.road', label: c.road, placeholder: 'A-42' },
        place('data.destinationId'),
        summary,
        pageHeading,
        picture,
        { kind: 'text', path: 'data.intro', label: c.intro, localized: true, multiline: true },
        { kind: 'paragraphs', path: 'data.journey', label: c.journey, hint: m.hints.paragraphs, rows: 8 },
        { kind: 'lines', path: 'data.highlights', label: c.highlights, hint: m.hints.lines },
        { kind: 'text', path: 'data.train', label: c.train, localized: true, multiline: true, rows: 4 },
        { kind: 'text', path: 'data.car', label: c.car, localized: true, multiline: true, rows: 4 },
        vehicles,
        questions,
        ...placement(m, true),
      ]
    case 'event':
      return [
        title,
        { kind: 'text', path: 'data.category', label: c.label, hint: c.labelHint, localized: true },
        { kind: 'date', path: 'data.start', label: c.start },
        { kind: 'date', path: 'data.end', label: c.end },
        { kind: 'text', path: 'data.venue', label: c.venue },
        place('data.placeId'),
        summary,
        pageHeading,
        picture,
        { kind: 'paragraphs', path: 'data.body', label: c.body, hint: m.hints.paragraphs, rows: 10 },
        { kind: 'lines', path: 'data.tips', label: c.tips, hint: m.hints.lines },
        ...placement(m, true),
      ]
    case 'article':
      return [
        title,
        { kind: 'text', path: 'data.category', label: c.label, localized: true },
        { kind: 'date', path: 'data.date', label: c.date },
        { kind: 'number', path: 'data.minutes', label: c.readingMinutes, min: 1 },
        { kind: 'text', path: 'data.excerpt', label: c.excerpt, hint: c.summaryHint, localized: true, multiline: true },
        picture,
        { kind: 'sections', path: 'data.body', label: c.body, hint: m.hints.sections, rows: 18 },
        { kind: 'text', path: 'data.cta.label', label: c.buttonLabel, localized: true },
        { kind: 'text', path: 'data.cta.href', label: c.buttonLink, hint: c.buttonLinkHint, placeholder: '/booking' },
        ...placement(m, true),
      ]
    case 'faq':
      return [
        { kind: 'text', path: 'data.question', label: c.question, localized: true },
        { kind: 'text', path: 'data.answer', label: c.answer, localized: true, multiline: true, rows: 5 },
        { kind: 'boolean', path: 'data.featured', label: c.featured },
        ...placement(m, false),
      ]
    case 'review':
      return [
        { kind: 'text', path: 'data.quote', label: c.quote, localized: true, multiline: true, rows: 4 },
        { kind: 'text', path: 'data.author', label: c.author, localized: true },
        { kind: 'text', path: 'data.context', label: c.context, hint: c.contextHint, localized: true },
        ...placement(m, false),
      ]
    case 'legal':
      return [
        title,
        { kind: 'text', path: 'data.summary', label: c.summary, localized: true },
        { kind: 'date', path: 'data.updated', label: c.updated },
        { kind: 'sections', path: 'data.sections', label: c.body, hint: `${m.hints.sections} ${c.legalHint}`, rows: 24 },
        ...placement(m, true),
      ]
  }
}

const today = () => new Date().toISOString().slice(0, 10)

/** An empty entry of each kind, for the "add" form. */
export function blankEntry(collection: Collection, sortOrder: number): Draft {
  const data: Record<Collection, Draft> = {
    service: { rideType: 'one_way', icon: 'route', title: empty, summary: empty, heading: empty, intro: emptyList, includes: emptyList, idealFor: emptyList, vehicles: [], faqs: emptyList, image: null },
    route: { destinationId: null, city: empty, km: null, minutes: null, road: '', summary: empty, heading: empty, intro: empty, journey: emptyList, highlights: emptyList, train: empty, car: empty, vehicles: [], faqs: emptyList, image: null },
    event: { category: empty, title: empty, venue: '', placeId: null, start: '', end: '', summary: empty, heading: empty, body: emptyList, tips: emptyList, image: null },
    article: { date: today(), minutes: 3, category: empty, title: empty, excerpt: empty, body: emptyList, cta: { href: '/booking', label: { en: 'Book a ride', es: 'Reservar' } }, image: null },
    faq: { question: empty, answer: empty, featured: false },
    review: { quote: empty, author: empty, context: empty },
    legal: { title: empty, summary: empty, updated: today(), sections: emptyList },
  }
  return { slug: '', sortOrder, published: true, data: data[collection] }
}

const text = (value: unknown, locale: Locale): string => (value as Record<Locale, string> | undefined)?.[locale] ?? ''

/** How an entry is named in the console's lists. */
export function entryTitle(collection: Collection, data: Draft, locale: Locale): string {
  if (collection === 'route') return text(data.city, locale)
  if (collection === 'faq') return text(data.question, locale)
  if (collection === 'review') return text(data.author, locale)
  return text(data.title, locale)
}

/** A second line for the list: dates, distance, the start of a quote. */
export function entryDetail(collection: Collection, data: Draft, locale: Locale): string {
  switch (collection) {
    case 'route':
      return `${String(data.km)} km · ${String(data.minutes)} min · ${String(data.road)}`
    case 'event':
      return `${String(data.start)} – ${String(data.end)} · ${String(data.venue)}`
    case 'article':
      return `${String(data.date)} · ${text(data.category, locale)}`
    case 'review':
      return text(data.quote, locale)
    case 'legal':
      return String(data.updated)
    case 'faq':
      return text(data.answer, locale)
    case 'service':
      return text(data.summary, locale)
  }
}

/** The public page of an entry, for the collections that have one. */
export const PAGE_PATHS: Partial<Record<Collection, string>> = { service: '/services', route: '/routes', event: '/events', article: '/journal', legal: '/legal' }

export function settingsFields(m: ManageMessages): FieldDef[] {
  const b = m.business
  return [
    heading(b.contact),
    { kind: 'text', path: 'phone', label: b.phone, placeholder: '+34 600 111 222' },
    { kind: 'text', path: 'whatsapp', label: b.whatsapp, hint: b.whatsappHint, placeholder: '34600111222' },
    { kind: 'text', path: 'email', label: b.email },
    heading(b.social, b.socialHint),
    { kind: 'text', path: 'social.instagram', label: 'Instagram' },
    { kind: 'text', path: 'social.facebook', label: 'Facebook' },
    { kind: 'text', path: 'social.tripadvisor', label: 'Tripadvisor' },
    { kind: 'text', path: 'social.google', label: 'Google' },
    heading(b.company),
    { kind: 'text', path: 'legal.companyName', label: b.companyName },
    { kind: 'text', path: 'legal.taxId', label: b.taxId },
    { kind: 'text', path: 'legal.licence', label: b.licence },
    { kind: 'text', path: 'legal.registry', label: b.registry },
    { kind: 'text', path: 'legal.address', label: b.address },
    heading(b.reviews),
    { kind: 'boolean', path: 'reviewsAreSamples', label: b.reviewsAreSamples, hint: b.reviewsHint },
  ]
}
