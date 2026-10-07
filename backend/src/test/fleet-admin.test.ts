import request from 'supertest'
import { beforeEach, describe, expect, it } from 'vitest'
import { adminAgent, bookRide, buildApp, registerAgent, resetDatabase } from './helpers.js'

const app = buildApp()

beforeEach(resetDatabase)

/** A 1x1 transparent PNG. */
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64')
/** The start of a JPEG file is enough for the type check. */
const JPEG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(64, 1)])

const vehiclePayload = (overrides: Record<string, unknown> = {}) => ({
  name: 'Tesla Model S',
  category: 'sedan',
  bodyType: 'sedan',
  passengers: 3,
  luggage: 2,
  baseFareCents: 2500,
  perKmCents: 210,
  hourlyRateCents: 7000,
  minFareCents: 7000,
  tagline: { en: 'Electric sedan', es: 'Berlina eléctrica' },
  description: { en: 'Quiet, quick and fully electric.', es: 'Silencioso, rápido y totalmente eléctrico.' },
  highlights: { en: ['Zero tailpipe emissions'], es: ['Cero emisiones'] },
  ...overrides,
})

const publicSlugs = async () => ((await request(app).get('/api/vehicles')).body.vehicles as { slug: string }[]).map((vehicle) => vehicle.slug)

describe('fleet management access', () => {
  it('is for operators only', async () => {
    expect((await request(app).get('/api/admin/vehicles')).status).toBe(401)
    expect((await request(app).post('/api/admin/vehicles').send(vehiclePayload())).status).toBe(401)
    expect((await request(app).post('/api/admin/media').set('Content-Type', 'image/png').send(PNG)).status).toBe(401)

    const customer = await registerAgent(app)
    expect((await customer.get('/api/admin/vehicles')).status).toBe(403)
    expect((await customer.post('/api/admin/vehicles').send(vehiclePayload())).status).toBe(403)
    expect((await customer.post('/api/admin/media').set('Content-Type', 'image/png').send(PNG)).status).toBe(403)
    expect(await publicSlugs()).not.toContain('tesla-model-s')
  })
})

describe('adding and editing vehicles', () => {
  it('lists every vehicle with its rates, in display order', async () => {
    const admin = await adminAgent(app)
    const response = await admin.get('/api/admin/vehicles')
    expect(response.body.vehicles).toHaveLength(7)
    expect(response.body.vehicles[0]).toMatchObject({ slug: 'mercedes-e-class', perKmCents: 190, sortOrder: 10, active: true })
  })

  it('adds a vehicle, which the website then offers', async () => {
    const admin = await adminAgent(app)
    const created = await admin.post('/api/admin/vehicles').send(vehiclePayload({ sortOrder: 5 }))
    expect(created.status).toBe(201)
    // The web address is made from the name when none is given.
    expect(created.body.vehicle).toMatchObject({ slug: 'tesla-model-s', sortOrder: 5, active: true, imageUrl: null })

    // Lower positions come first.
    expect((await publicSlugs())[0]).toBe('tesla-model-s')
    const page = await request(app).get('/api/vehicles/tesla-model-s')
    expect(page.body.vehicle).toMatchObject({ name: 'Tesla Model S', fromCents: 7000 })
    // Rates other than the starting price stay private.
    expect(page.body.vehicle.perKmCents).toBeUndefined()
  })

  it('refuses a web address that is already taken', async () => {
    const admin = await adminAgent(app)
    const response = await admin.post('/api/admin/vehicles').send(vehiclePayload({ slug: 'mercedes-e-class' }))
    expect(response.status).toBe(409)
    expect(response.body.error).toMatchObject({ code: 'SLUG_TAKEN', fields: { slug: 'taken' } })

    // The same happens when the name alone would produce a taken address.
    await admin.post('/api/admin/vehicles').send(vehiclePayload())
    expect((await admin.post('/api/admin/vehicles').send(vehiclePayload())).status).toBe(409)
  })

  it('explains what is wrong with a submission, field by field', async () => {
    const admin = await adminAgent(app)
    const response = await admin.post('/api/admin/vehicles').send(
      vehiclePayload({
        name: '',
        passengers: 0,
        perKmCents: -1,
        tagline: { en: 'Only English', es: '' },
        imageUrl: 'https://elsewhere.example/car.jpg',
        slug: 'Not A Slug',
      }),
    )
    expect(response.status).toBe(400)
    expect(response.body.error.fields).toMatchObject({
      name: 'required',
      passengers: 'too_small',
      perKmCents: 'too_small',
      'tagline.es': 'required',
      imageUrl: 'invalid_image',
      slug: 'invalid_slug',
    })
  })

  it('updates prices, position and visibility', async () => {
    const admin = await adminAgent(app)
    const { vehicles } = (await admin.get('/api/admin/vehicles')).body as { vehicles: Record<string, unknown>[] }
    const yaris = vehicles.find((vehicle) => vehicle.slug === 'toyota-yaris')
    if (!yaris) throw new Error('fixture vehicle missing')

    const moved = await admin.put(`/api/admin/vehicles/${String(yaris.id)}`).send({ ...yaris, minFareCents: 4500, sortOrder: 1 })
    expect(moved.body.vehicle).toMatchObject({ minFareCents: 4500, sortOrder: 1 })
    expect((await publicSlugs())[0]).toBe('toyota-yaris')
    expect((await request(app).get('/api/vehicles/toyota-yaris')).body.vehicle.fromCents).toBe(4500)

    // A hidden vehicle disappears from the website but stays in the console.
    await admin.put(`/api/admin/vehicles/${String(yaris.id)}`).send({ ...yaris, active: false })
    expect(await publicSlugs()).not.toContain('toyota-yaris')
    expect((await request(app).get('/api/vehicles/toyota-yaris')).status).toBe(404)
    expect(((await admin.get('/api/admin/vehicles')).body.vehicles as { slug: string }[]).map((vehicle) => vehicle.slug)).toContain('toyota-yaris')
  })

  it('deletes a vehicle that was never booked, and keeps one that was', async () => {
    const admin = await adminAgent(app)
    const created = (await admin.post('/api/admin/vehicles').send(vehiclePayload())).body.vehicle as { id: string }
    expect((await admin.delete(`/api/admin/vehicles/${created.id}`)).status).toBe(200)
    expect(await publicSlugs()).not.toContain('tesla-model-s')

    const { choice } = await bookRide(app)
    const booked = await admin.delete(`/api/admin/vehicles/${choice.vehicleId}`)
    expect(booked.status).toBe(409)
    expect(booked.body.error.code).toBe('VEHICLE_IN_USE')

    expect((await admin.delete('/api/admin/vehicles/00000000-0000-4000-8000-000000000000')).status).toBe(404)
    expect((await admin.delete('/api/admin/vehicles/not-an-id')).status).toBe(404)
    expect((await admin.put('/api/admin/vehicles/not-an-id').send(vehiclePayload())).status).toBe(404)
  })
})

describe('vehicle photos', () => {
  const upload = (agent: Awaited<ReturnType<typeof adminAgent>>, bytes: Buffer, type = 'image/png') => agent.post('/api/admin/media').set('Content-Type', type).send(bytes)

  it('stores an uploaded image and serves it to everyone', async () => {
    const admin = await adminAgent(app)
    const uploaded = await upload(admin, PNG)
    expect(uploaded.status).toBe(201)
    expect(uploaded.body.media).toMatchObject({ contentType: 'image/png', size: PNG.length })
    expect(uploaded.body.media.url).toMatch(/^\/api\/media\/[0-9a-f-]{36}$/)

    const served = await request(app).get(uploaded.body.media.url as string).buffer(true).parse((res, done) => {
      const chunks: Buffer[] = []
      res.on('data', (chunk: Buffer) => chunks.push(chunk))
      res.on('end', () => done(null, Buffer.concat(chunks)))
    })
    expect(served.status).toBe(200)
    expect(served.headers['content-type']).toBe('image/png')
    expect(served.headers['cache-control']).toContain('immutable')
    expect(served.headers['x-content-type-options']).toBe('nosniff')
    expect(Buffer.compare(served.body as Buffer, PNG)).toBe(0)
  })

  it('judges a file by its contents, not by its label', async () => {
    const admin = await adminAgent(app)
    // A JPEG sent as PNG is stored as what it is.
    expect((await upload(admin, JPEG, 'image/png')).body.media.contentType).toBe('image/jpeg')

    const script = await upload(admin, Buffer.from('<script>alert(1)</script>'), 'image/png')
    expect(script.status).toBe(400)
    expect(script.body.error.code).toBe('UNSUPPORTED_IMAGE')
    expect((await upload(admin, PNG, 'application/pdf')).status).toBe(400)
    expect((await admin.post('/api/admin/media').send({ url: 'x' })).status).toBe(400)
  })

  it('refuses files over 4 MB', async () => {
    const admin = await adminAgent(app)
    const large = Buffer.concat([PNG, Buffer.alloc(4 * 1024 * 1024)])
    const response = await upload(admin, large)
    expect(response.status).toBe(413)
    expect(response.body.error.code).toBe('PAYLOAD_TOO_LARGE')
  })

  it('answers 404 for images that do not exist', async () => {
    expect((await request(app).get('/api/media/00000000-0000-4000-8000-000000000000')).status).toBe(404)
    expect((await request(app).get('/api/media/not-an-id')).status).toBe(404)
  })

  it('removes an uploaded photo once no vehicle shows it', async () => {
    const admin = await adminAgent(app)
    const first = (await upload(admin, PNG)).body.media.url as string
    const second = (await upload(admin, JPEG, 'image/jpeg')).body.media.url as string

    const one = (await admin.post('/api/admin/vehicles').send(vehiclePayload({ imageUrl: first }))).body.vehicle as Record<string, unknown>
    const two = (await admin.post('/api/admin/vehicles').send(vehiclePayload({ name: 'Tesla Model X', imageUrl: first }))).body.vehicle as Record<string, unknown>
    expect(one.imageUrl).toBe(first)

    // Still shown by the second vehicle, so replacing it on the first keeps the file.
    await admin.put(`/api/admin/vehicles/${String(one.id)}`).send({ ...one, imageUrl: second })
    expect((await request(app).get(first)).status).toBe(200)

    // Now nothing shows it.
    await admin.put(`/api/admin/vehicles/${String(two.id)}`).send({ ...two, imageUrl: null })
    expect((await request(app).get(first)).status).toBe(404)

    // Deleting a vehicle takes its photo with it.
    expect((await request(app).get(second)).status).toBe(200)
    await admin.delete(`/api/admin/vehicles/${String(one.id)}`)
    expect((await request(app).get(second)).status).toBe(404)

    // Photos that ship with the website are just addresses; nothing is deleted for them.
    const shipped = await admin.post('/api/admin/vehicles').send(vehiclePayload({ name: 'Tesla Model 3', imageUrl: '/images/fleet/tesla-model-3.jpg' }))
    expect(shipped.status).toBe(201)
    expect((await admin.delete(`/api/admin/vehicles/${String(shipped.body.vehicle.id)}`)).status).toBe(200)
  })
})
