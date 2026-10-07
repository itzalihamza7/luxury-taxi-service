import { asc, eq } from 'drizzle-orm'
import { Router } from 'express'
import { z } from 'zod'
import { db } from '../../db/client.js'
import { vehicles, type Vehicle } from '../../db/schema.js'
import { conflict, HttpError, notFound } from '../../lib/errors.js'
import { imageUrl, isUuid, localizedLines, localizedText, parse, slug, slugify } from '../../lib/validate.js'
import { releaseMedia } from '../media/routes.js'

const cents = z.number().int().min(0).max(1_000_000)

const vehicleSchema = z.object({
  /** Left out, it is made from the name. */
  slug: slug.optional(),
  name: z.string().trim().min(2).max(120),
  category: z.enum(['economy', 'sedan', 'van', 'group', 'flagship']),
  bodyType: z.enum(['hatchback', 'sedan', 'limousine', 'van', 'minibus']),
  passengers: z.number().int().min(1).max(60),
  luggage: z.number().int().min(0).max(60),
  baseFareCents: cents,
  perKmCents: cents,
  hourlyRateCents: cents,
  minFareCents: cents,
  tagline: localizedText(80),
  description: localizedText(1200),
  highlights: localizedLines(200, 8),
  imageUrl: imageUrl.nullish().transform((value) => value ?? null),
  /** Position on the website: lower numbers come first. */
  sortOrder: z.number().int().min(0).max(100_000).default(0),
  /** Hidden vehicles stay in past bookings but cannot be booked or seen. */
  active: z.boolean().default(true),
})

/** Everything the console needs to edit a vehicle, including its rates. */
export function serializeAdminVehicle(vehicle: Vehicle) {
  const { createdAt: _createdAt, ...fields } = vehicle
  return fields
}

const isUniqueViolation = (error: unknown) => (error as { code?: string; cause?: { code?: string } })?.code === '23505' || (error as { cause?: { code?: string } })?.cause?.code === '23505'
const isForeignKeyViolation = (error: unknown) => (error as { code?: string })?.code === '23503' || (error as { cause?: { code?: string } })?.cause?.code === '23503'

const slugTaken = () => new HttpError(409, 'SLUG_TAKEN', 'Another vehicle already uses this web address.', { slug: 'taken' })

async function findVehicle(id: unknown): Promise<Vehicle> {
  const [vehicle] = isUuid(id) ? await db.select().from(vehicles).where(eq(vehicles.id, id)) : []
  if (!vehicle) throw notFound('VEHICLE_NOT_FOUND', 'Vehicle not found.')
  return vehicle
}

export function vehiclesAdminRouter(): Router {
  const router = Router()

  router.get('/', async (_req, res) => {
    const rows = await db.select().from(vehicles).orderBy(asc(vehicles.sortOrder), asc(vehicles.name))
    res.json({ vehicles: rows.map(serializeAdminVehicle) })
  })

  router.post('/', async (req, res) => {
    const input = parse(vehicleSchema, req.body)
    const values = { ...input, slug: input.slug ?? slugify(input.name) }
    if (!values.slug) throw new HttpError(400, 'VALIDATION', 'Please check the highlighted fields.', { slug: 'required' })
    try {
      const [created] = await db.insert(vehicles).values(values).returning()
      if (!created) throw new Error('vehicle insert returned no row')
      res.status(201).json({ vehicle: serializeAdminVehicle(created) })
    } catch (error) {
      if (isUniqueViolation(error)) throw slugTaken()
      throw error
    }
  })

  router.put('/:id', async (req, res) => {
    const input = parse(vehicleSchema, req.body)
    const existing = await findVehicle(req.params.id)
    try {
      const [updated] = await db
        .update(vehicles)
        .set({ ...input, slug: input.slug ?? existing.slug })
        .where(eq(vehicles.id, existing.id))
        .returning()
      if (existing.imageUrl !== (updated ?? existing).imageUrl) await releaseMedia(existing.imageUrl)
      res.json({ vehicle: serializeAdminVehicle(updated ?? existing) })
    } catch (error) {
      if (isUniqueViolation(error)) throw slugTaken()
      throw error
    }
  })

  router.delete('/:id', async (req, res) => {
    const existing = await findVehicle(req.params.id)
    try {
      await db.delete(vehicles).where(eq(vehicles.id, existing.id))
    } catch (error) {
      // Bookings keep a link to their vehicle, so a vehicle that has been booked can only be hidden.
      if (isForeignKeyViolation(error)) throw conflict('VEHICLE_IN_USE', 'This vehicle has bookings. Hide it instead of deleting it.')
      throw error
    }
    await releaseMedia(existing.imageUrl)
    res.json({ ok: true })
  })

  return router
}
