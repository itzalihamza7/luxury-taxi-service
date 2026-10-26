import { and, asc, eq } from 'drizzle-orm'
import { Router } from 'express'
import { db } from '../../db/client.js'
import { vehicles, type Vehicle } from '../../db/schema.js'
import { notFound } from '../../lib/errors.js'

export function serializeVehicle(vehicle: Vehicle) {
  return {
    id: vehicle.id,
    slug: vehicle.slug,
    name: vehicle.name,
    category: vehicle.category,
    bodyType: vehicle.bodyType,
    passengers: vehicle.passengers,
    luggage: vehicle.luggage,
    tagline: vehicle.tagline,
    description: vehicle.description,
    highlights: vehicle.highlights,
    imageUrl: vehicle.imageUrl,
    /** Lowest fare for a transfer, and the hourly hire rate. */
    fromCents: vehicle.zoneFareCents,
    hourlyRateCents: vehicle.hourlyRateCents,
  }
}

export type PublicVehicle = ReturnType<typeof serializeVehicle>

/*
 * `?view=compact`: what an AI assistant needs to name and choose a vehicle, without the
 * descriptions in two languages. Assistants such as the website chat read only the first couple
 * of thousand characters of an answer, and the full fleet is several times that.
 */
export const wantsCompact = (query: unknown) => (query as { view?: unknown } | undefined)?.view === 'compact'

export function compactVehicle(vehicle: Vehicle) {
  return {
    id: vehicle.id,
    name: vehicle.name,
    category: vehicle.category,
    passengers: vehicle.passengers,
    luggage: vehicle.luggage,
    fromCents: vehicle.zoneFareCents,
    hourlyRateCents: vehicle.hourlyRateCents,
  }
}

export function listActiveVehicles(): Promise<Vehicle[]> {
  return db.select().from(vehicles).where(eq(vehicles.active, true)).orderBy(asc(vehicles.sortOrder), asc(vehicles.name))
}

export function vehiclesRouter(): Router {
  const router = Router()

  router.get('/', async (req, res) => {
    const rows = await listActiveVehicles()
    res.json({ vehicles: rows.map(wantsCompact(req.query) ? compactVehicle : serializeVehicle) })
  })

  router.get('/:slug', async (req, res) => {
    const [vehicle] = await db
      .select()
      .from(vehicles)
      .where(and(eq(vehicles.slug, req.params.slug), eq(vehicles.active, true)))
    if (!vehicle) throw notFound('VEHICLE_NOT_FOUND', 'Vehicle not found.')
    res.json({ vehicle: serializeVehicle(vehicle) })
  })

  return router
}
