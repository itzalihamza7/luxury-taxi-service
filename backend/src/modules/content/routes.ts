import { and, asc, eq, ne } from 'drizzle-orm'
import { Router } from 'express'
import { z } from 'zod'
import { DEFAULT_SITE_SETTINGS } from '../../db/content/settings.js'
import { db } from '../../db/client.js'
import { CONTENT_COLLECTIONS, contentEntries, settings, type ContentCollection, type ContentEntry } from '../../db/schema.js'
import { HttpError, notFound } from '../../lib/errors.js'
import { isUuid, parse, slug, slugify } from '../../lib/validate.js'
import { releaseMedia } from '../media/routes.js'
import { COLLECTIONS_WITH_PAGES, contentSchemas, siteSettingsSchema, type SiteSettings } from './schemas.js'

const SITE_KEY = 'site'

function collectionParam(value: unknown): ContentCollection {
  if (typeof value === 'string' && (CONTENT_COLLECTIONS as readonly string[]).includes(value)) return value as ContentCollection
  throw notFound('COLLECTION_NOT_FOUND', 'Unknown kind of content.')
}

/** An entry as the website reads it: its fields, with the slug and id alongside. */
const serializeEntry = (entry: ContentEntry) => ({ ...entry.data, id: entry.id, slug: entry.slug })

/** An entry as the console edits it. */
const serializeAdminEntry = (entry: ContentEntry) => ({
  id: entry.id,
  slug: entry.slug,
  sortOrder: entry.sortOrder,
  published: entry.published,
  updatedAt: entry.updatedAt.toISOString(),
  data: entry.data,
})

export async function getSiteSettings(): Promise<SiteSettings> {
  const [row] = await db.select().from(settings).where(eq(settings.key, SITE_KEY))
  // Stored settings were validated when saved; the defaults cover a database that has not been seeded.
  return { ...DEFAULT_SITE_SETTINGS, ...(row?.value as Partial<SiteSettings> | undefined) }
}

/** Public: the published content and the business details. */
export function contentRouter(): Router {
  const router = Router()

  router.get('/settings', async (_req, res) => {
    res.json({ settings: await getSiteSettings() })
  })

  router.get('/:collection', async (req, res) => {
    const collection = collectionParam(req.params.collection)
    const rows = await db
      .select()
      .from(contentEntries)
      .where(and(eq(contentEntries.collection, collection), eq(contentEntries.published, true)))
      .orderBy(asc(contentEntries.sortOrder), asc(contentEntries.createdAt))
    res.json({ entries: rows.map(serializeEntry) })
  })

  return router
}

const entrySchema = <C extends ContentCollection>(collection: C) =>
  z.object({
    /** Left out, it is made from the title. */
    slug: slug.optional(),
    /** Position on the website: lower numbers come first. */
    sortOrder: z.number().int().min(0).max(100_000).default(0),
    published: z.boolean().default(true),
    data: contentSchemas[collection],
  })

/** The text a new entry's address is made from, when the operator does not choose one. */
function slugSource(collection: ContentCollection, data: Record<string, unknown>): string {
  const english = (field: string) => (data[field] as { en?: string } | undefined)?.en ?? ''
  if (collection === 'route') return `madrid-to-${english('city')}`
  return english('title')
}

async function slugInUse(collection: ContentCollection, candidate: string, exceptId?: string): Promise<boolean> {
  const sameSlug = and(eq(contentEntries.collection, collection), eq(contentEntries.slug, candidate))
  const [row] = await db
    .select({ id: contentEntries.id })
    .from(contentEntries)
    .where(exceptId ? and(sameSlug, ne(contentEntries.id, exceptId)) : sameSlug)
    .limit(1)
  return Boolean(row)
}

async function freeSlug(collection: ContentCollection, data: Record<string, unknown>): Promise<string> {
  const base = (COLLECTIONS_WITH_PAGES.includes(collection) && slugify(slugSource(collection, data))) || collection
  let candidate = base
  for (let suffix = 2; await slugInUse(collection, candidate); suffix += 1) candidate = `${base}-${suffix}`
  return candidate
}

const slugTaken = () => new HttpError(409, 'SLUG_TAKEN', 'Another entry already uses this web address.', { slug: 'taken' })

async function findEntry(collection: ContentCollection, id: unknown): Promise<ContentEntry> {
  const [entry] = isUuid(id)
    ? await db
        .select()
        .from(contentEntries)
        .where(and(eq(contentEntries.id, id), eq(contentEntries.collection, collection)))
    : []
  if (!entry) throw notFound('ENTRY_NOT_FOUND', 'Entry not found.')
  return entry
}

const imageOf = (data: Record<string, unknown>) => (typeof data.image === 'string' ? data.image : null)

/** Console: manage content and business details. Mounted behind `requireAdmin`. */
export function contentAdminRouter(): Router {
  const router = Router()

  router.get('/settings', async (_req, res) => {
    res.json({ settings: await getSiteSettings() })
  })

  router.put('/settings', async (req, res) => {
    const value = parse(siteSettingsSchema, req.body)
    await db
      .insert(settings)
      .values({ key: SITE_KEY, value })
      .onConflictDoUpdate({ target: settings.key, set: { value, updatedAt: new Date() } })
    res.json({ settings: value })
  })

  router.get('/content/:collection', async (req, res) => {
    const collection = collectionParam(req.params.collection)
    const rows = await db
      .select()
      .from(contentEntries)
      .where(eq(contentEntries.collection, collection))
      .orderBy(asc(contentEntries.sortOrder), asc(contentEntries.createdAt))
    res.json({ entries: rows.map(serializeAdminEntry) })
  })

  router.post('/content/:collection', async (req, res) => {
    const collection = collectionParam(req.params.collection)
    const input = parse(entrySchema(collection), req.body)
    const data = input.data as Record<string, unknown>
    if (input.slug && (await slugInUse(collection, input.slug))) throw slugTaken()

    const [created] = await db
      .insert(contentEntries)
      .values({ collection, slug: input.slug ?? (await freeSlug(collection, data)), sortOrder: input.sortOrder, published: input.published, data })
      .returning()
    if (!created) throw new Error('content insert returned no row')
    res.status(201).json({ entry: serializeAdminEntry(created) })
  })

  router.put('/content/:collection/:id', async (req, res) => {
    const collection = collectionParam(req.params.collection)
    const input = parse(entrySchema(collection), req.body)
    const data = input.data as Record<string, unknown>
    const existing = await findEntry(collection, req.params.id)
    if (input.slug && (await slugInUse(collection, input.slug, existing.id))) throw slugTaken()

    const [updated] = await db
      .update(contentEntries)
      .set({ slug: input.slug ?? existing.slug, sortOrder: input.sortOrder, published: input.published, data, updatedAt: new Date() })
      .where(eq(contentEntries.id, existing.id))
      .returning()
    if (imageOf(existing.data) !== imageOf(data)) await releaseMedia(imageOf(existing.data))
    res.json({ entry: serializeAdminEntry(updated ?? existing) })
  })

  router.delete('/content/:collection/:id', async (req, res) => {
    const collection = collectionParam(req.params.collection)
    const existing = await findEntry(collection, req.params.id)
    await db.delete(contentEntries).where(eq(contentEntries.id, existing.id))
    await releaseMedia(imageOf(existing.data))
    res.json({ ok: true })
  })

  return router
}
