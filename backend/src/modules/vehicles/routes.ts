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
    fromCents: vehicle.minFareCents,
    hourlyRateCents: vehicle.hourlyRateCents,
  }
}

export type PublicVehicle = ReturnType<typeof serializeVehicle>

export function listActiveVehicles(): Promise<Vehicle[]> {
  return db.select().from(vehicles).where(eq(vehicles.active, true)).orderBy(asc(vehicles.sortOrder), asc(vehicles.name))
}

export function vehiclesRouter(): Router {
  const router = Router()

  router.get('/', async (_req, res) => {
    const rows = await listActiveVehicles()
    res.json({ vehicles: rows.map(serializeVehicle) })
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
