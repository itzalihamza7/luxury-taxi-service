import { eq, sql } from 'drizzle-orm'
import express, { Router } from 'express'
import { db } from '../../db/client.js'
import { contentEntries, media, vehicles } from '../../db/schema.js'
import { badRequest, notFound } from '../../lib/errors.js'

const MAX_BYTES = 4 * 1024 * 1024
const MEDIA_URL = /^\/api\/media\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** The image type, judged by the file's first bytes rather than by what the sender claims. */
export function sniffImageType(bytes: Buffer): 'image/jpeg' | 'image/png' | 'image/webp' | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg'
  if (bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png'
  if (bytes.length >= 12 && bytes.toString('latin1', 0, 4) === 'RIFF' && bytes.toString('latin1', 8, 12) === 'WEBP') return 'image/webp'
  return null
}

export const mediaUrl = (id: string) => `/api/media/${id}`

/**
 * Delete an uploaded image once nothing shows it any more. Does nothing for
 * images that ship with the website (`/images/...`) or are still in use.
 */
export async function releaseMedia(url: string | null | undefined): Promise<void> {
  const id = url ? MEDIA_URL.exec(url)?.[1] : undefined
  if (!id || !url) return
  const [vehicle] = await db.select({ id: vehicles.id }).from(vehicles).where(eq(vehicles.imageUrl, url)).limit(1)
  if (vehicle) return
  const [entry] = await db
    .select({ id: contentEntries.id })
    .from(contentEntries)
    .where(sql`${contentEntries.data}::text like ${`%${id}%`}`)
    .limit(1)
  if (entry) return
  await db.delete(media).where(eq(media.id, id))
}

/** Public: serves uploaded images. The address never changes content, so browsers may keep it for good. */
export function mediaRouter(): Router {
  const router = Router()

  router.get('/:id', async (req, res) => {
    if (!UUID.test(req.params.id)) throw notFound('MEDIA_NOT_FOUND', 'Image not found.')
    const [file] = await db.select().from(media).where(eq(media.id, req.params.id))
    if (!file) throw notFound('MEDIA_NOT_FOUND', 'Image not found.')

    res.set({
      'Content-Type': file.contentType,
      'Content-Length': String(file.size),
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'",
    })
    res.end(file.data)
  })

  return router
}

/** Console: upload an image. The body is the file itself (JPEG, PNG or WebP, up to 4 MB). */
export function mediaAdminRouter(): Router {
  const router = Router()

  router.post('/', express.raw({ type: ['image/jpeg', 'image/png', 'image/webp'], limit: MAX_BYTES }), async (req, res) => {
    const bytes: unknown = req.body
    const contentType = Buffer.isBuffer(bytes) && bytes.length > 0 ? sniffImageType(bytes) : null
    if (!Buffer.isBuffer(bytes) || !contentType) throw badRequest('UNSUPPORTED_IMAGE', 'Upload a JPEG, PNG or WebP image.')

    const [file] = await db.insert(media).values({ contentType, size: bytes.length, data: bytes }).returning({ id: media.id })
    if (!file) throw new Error('media insert returned no row')
    res.status(201).json({ media: { id: file.id, url: mediaUrl(file.id), contentType, size: bytes.length } })
  })

  return router
}
