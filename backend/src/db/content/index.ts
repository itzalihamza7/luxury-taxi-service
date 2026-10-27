import type { ContentCollection } from '../schema.js'
import { articles } from './articles.js'
import { events } from './events.js'
import { faqs } from './faqs.js'
import { legalDocuments } from './legal.js'
import { testimonials } from './reviews.js'
import { routes } from './routes.js'
import { services } from './services.js'
import type { Localized } from './types.js'

/**
 * The content a new website starts with. It is written to the database once per
 * collection (see `seed.ts`); after that the console is where content is edited,
 * and changes to these files no longer reach an existing site.
 */

export interface StartingEntry {
  slug: string
  sortOrder: number
  data: Record<string, unknown>
}

type Question = { question: Localized; answer: Localized }

/** `[{ question: {en, es}, answer: {en, es} }]` -> one list of questions per language. */
function perLanguage(questions: Question[]): Localized<{ question: string; answer: string }[]> {
  return {
    en: questions.map((item) => ({ question: item.question.en, answer: item.answer.en })),
    es: questions.map((item) => ({ question: item.question.es, answer: item.answer.es })),
  }
}

/** The label shown above each starting event. In the console it is free text. */
const EVENT_LABELS = {
  fair: { en: 'Trade fair', es: 'Feria profesional' },
  art: { en: 'Art fair', es: 'Feria de arte' },
  sport: { en: 'Tennis', es: 'Tenis' },
} as const

/**
 * Pictures that ship with the website (`frontend/public/images/`), by entry.
 * Entries without one are shown without a picture until the operator adds it.
 */
const PICTURES: Record<string, string> = {
  'airport-transfers': '/images/services/airport.jpg',
  'hourly-chauffeur': '/images/services/hourly.jpg',
  'madrid-city-rides': '/images/services/city.jpg',
  'city-to-city': '/images/services/intercity.jpg',
  'day-trips': '/images/services/day-trips.jpg',
  'madrid-to-toledo': '/images/routes/toledo.jpg',
  'madrid-to-segovia': '/images/routes/segovia.jpg',
  'madrid-to-avila': '/images/routes/avila.jpg',
  'madrid-to-el-escorial': '/images/routes/el-escorial.jpg',
  'madrid-airport-taxi-or-chauffeur': '/images/services/airport.jpg',
  'arriving-at-madrid-barajas': '/images/journal/barajas.jpg',
  'sedan-van-or-minibus': '/images/fleet/mercedes-v-class.jpg',
  'hourly-hire-or-transfers': '/images/journal/cabin.jpg',
  'choosing-a-day-trip-from-madrid': '/images/routes/avila.jpg',
}

const withPicture = (entry: StartingEntry): StartingEntry => ({ ...entry, data: { ...entry.data, image: PICTURES[entry.slug] ?? null } })

/** Slug apart, the fields of an entry become its `data`; positions leave room to insert between entries. */
function entries<T extends { slug: string }>(items: T[], toData: (item: Omit<T, 'slug'>) => Record<string, unknown>): StartingEntry[] {
  return items.map(({ slug, ...fields }, index) => ({ slug, sortOrder: (index + 1) * 10, data: toData(fields) }))
}

export function startingContent(): Record<ContentCollection, StartingEntry[]> {
  return {
    service: entries(services, (service) => ({ ...service, faqs: perLanguage(service.faqs) })).map(withPicture),
    route: entries(routes, (route) => ({ ...route, faqs: perLanguage(route.faqs) })).map(withPicture),
    event: entries(events, ({ kind, ...event }) => ({ ...event, category: EVENT_LABELS[kind] })).map(withPicture),
    article: entries(articles, (article) => article).map(withPicture),
    faq: entries(
      faqs.map((faq, index) => ({ ...faq, slug: faq.slug ?? `faq-${index + 1}` })),
      (faq) => ({ ...faq, featured: faq.featured ?? false }),
    ),
    review: entries(
      testimonials.map((review, index) => ({ ...review, slug: `review-${index + 1}` })),
      (review) => review,
    ),
    legal: entries(legalDocuments, (document) => document),
  }
}
