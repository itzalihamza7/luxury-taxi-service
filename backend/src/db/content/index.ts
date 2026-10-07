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

/** Slug apart, the fields of an entry become its `data`; positions leave room to insert between entries. */
function entries<T extends { slug: string }>(items: T[], toData: (item: Omit<T, 'slug'>) => Record<string, unknown>): StartingEntry[] {
  return items.map(({ slug, ...fields }, index) => ({ slug, sortOrder: (index + 1) * 10, data: toData(fields) }))
}

export function startingContent(): Record<ContentCollection, StartingEntry[]> {
  return {
    service: entries(services, (service) => ({ ...service, faqs: perLanguage(service.faqs), image: null })),
    route: entries(routes, (route) => ({ ...route, faqs: perLanguage(route.faqs), image: null })),
    event: entries(events, ({ kind, ...event }) => ({ ...event, category: EVENT_LABELS[kind], image: null })),
    article: entries(articles, (article) => ({ ...article, image: null })),
    faq: entries(
      faqs.map((faq, index) => ({ ...faq, slug: `faq-${index + 1}` })),
      (faq) => ({ ...faq, featured: faq.featured ?? false }),
    ),
    review: entries(
      testimonials.map((review, index) => ({ ...review, slug: `review-${index + 1}` })),
      (review) => review,
    ),
    legal: entries(legalDocuments, (document) => document),
  }
}
