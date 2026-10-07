import { z } from 'zod'
import type { ContentCollection } from '../../db/schema.js'
import { email, imageUrl, isoDate, localizedLines, localizedText, phone, slug } from '../../lib/validate.js'

/*
 * The shape of `data` for each kind of content. The website's types
 * (`frontend/src/lib/types.ts`) mirror these.
 */

const RIDE_TYPES = ['one_way', 'return', 'local', 'hourly', 'city_to_city', 'airport'] as const

const image = imageUrl.nullish().transform((value) => value ?? null)
/** Id of a place in the catalogue (e.g. `cat:toledo`), used to prefill the booking form. */
const placeId = z
  .string()
  .trim()
  .max(80)
  .nullish()
  .transform((value) => (value ? value : null))
const vehicleSlugs = z.array(slug).max(12)

const question = z.object({ question: z.string().trim().min(1).max(300), answer: z.string().trim().min(1).max(2000) })
const localizedQuestions = z.object({ en: z.array(question).max(20), es: z.array(question).max(20) })

/** A block of text: an optional heading, paragraphs and an optional bullet list. */
const section = z.object({
  heading: z.string().trim().min(1).max(200).optional(),
  paragraphs: z.array(z.string().trim().min(1).max(4000)).max(30).default([]),
  list: z.array(z.string().trim().min(1).max(1000)).max(30).optional(),
})
const localizedSections = z.object({ en: z.array(section).min(1).max(40), es: z.array(section).min(1).max(40) })

/** A link inside this website, e.g. `/routes` or `/booking?type=airport`. */
const internalLink = z
  .string()
  .trim()
  .max(200)
  .refine((value) => /^\/(?!\/)[^\s]*$/.test(value), { message: 'invalid_link' })

export const contentSchemas = {
  service: z.object({
    rideType: z.enum(RIDE_TYPES),
    icon: z.enum(['plane', 'clock', 'city', 'route', 'map']),
    title: localizedText(120),
    summary: localizedText(400),
    heading: localizedText(200),
    intro: localizedLines(2000, 8),
    includes: localizedLines(300),
    idealFor: localizedLines(300),
    vehicles: vehicleSlugs,
    faqs: localizedQuestions,
    image,
  }),
  route: z.object({
    destinationId: placeId,
    city: localizedText(80),
    km: z.number().int().min(1).max(2000),
    minutes: z.number().int().min(1).max(2000),
    road: z.string().trim().max(40),
    summary: localizedText(400),
    heading: localizedText(200),
    intro: localizedText(1500),
    journey: localizedLines(2000, 8),
    highlights: localizedLines(300),
    train: localizedText(1500),
    car: localizedText(1500),
    vehicles: vehicleSlugs,
    faqs: localizedQuestions,
    image,
  }),
  event: z
    .object({
      /** Short label above the title, e.g. "Trade fair". */
      category: localizedText(60),
      title: localizedText(120),
      venue: z.string().trim().min(1).max(120),
      placeId,
      start: isoDate,
      end: isoDate,
      summary: localizedText(400),
      heading: localizedText(200),
      body: localizedLines(2000, 10),
      tips: localizedLines(300),
      image,
    })
    .refine((value) => value.end >= value.start, { message: 'before_start', path: ['end'] }),
  article: z.object({
    date: isoDate,
    minutes: z.number().int().min(1).max(60),
    category: localizedText(60),
    title: localizedText(200),
    excerpt: localizedText(500),
    body: localizedSections,
    cta: z.object({ href: internalLink, label: localizedText(60) }),
    image,
  }),
  faq: z.object({
    question: localizedText(300),
    answer: localizedText(2000),
    /** Also shown on the home page. */
    featured: z.boolean().default(false),
  }),
  review: z.object({
    quote: localizedText(800),
    author: localizedText(120),
    context: localizedText(160),
  }),
  legal: z.object({
    title: localizedText(160),
    summary: localizedText(400),
    updated: isoDate,
    sections: localizedSections,
  }),
} satisfies Record<ContentCollection, z.ZodType>

export type ContentData<C extends ContentCollection> = z.infer<(typeof contentSchemas)[C]>

/** Collections whose entries have their own page, so the slug is part of a public address. */
export const COLLECTIONS_WITH_PAGES: ContentCollection[] = ['service', 'route', 'event', 'article', 'legal']

const link = z
  .string()
  .trim()
  .max(300)
  .refine((value) => value === '' || /^https:\/\/[^\s]+$/.test(value), { message: 'invalid_link' })

/** Business details shown across the website. Stored under the `site` settings key. */
export const siteSettingsSchema = z.object({
  phone,
  /** Digits only, with country code: used for the WhatsApp link. */
  whatsapp: z
    .string()
    .trim()
    .refine((value) => /^\d{7,15}$/.test(value), { message: 'invalid_phone' }),
  email,
  /** Leave a link empty to hide it. */
  social: z.object({ instagram: link, facebook: link, tripadvisor: link, google: link }),
  /** Used in the legal pages. */
  legal: z.object({
    companyName: z.string().trim().min(1).max(200),
    taxId: z.string().trim().min(1).max(60),
    address: z.string().trim().min(1).max(300),
    registry: z.string().trim().min(1).max(300),
    licence: z.string().trim().min(1).max(120),
  }),
  /** While true, the reviews section is labelled as showing sample reviews. */
  reviewsAreSamples: z.boolean(),
})

export type SiteSettings = z.infer<typeof siteSettingsSchema>
