import { eq } from 'drizzle-orm'
import request from 'supertest'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../db/client.js'
import { agentKeys, bookings } from '../db/schema.js'
import { adminAgent, bookRide, buildApp, CONTACT, quotePayload, registerAgent, resetDatabase } from './helpers.js'

const app = buildApp()

beforeEach(resetDatabase)

/** A new agent key, created by an admin. */
async function createKey(name = 'Vesper phone agent') {
  const admin = await adminAgent(app)
  const response = await admin.post('/api/admin/agent-keys').send({ name })
  expect(response.status).toBe(201)
  return { admin, key: response.body.key as string, id: response.body.agentKey.id as string }
}

const withKey = (key: string) => ({ Authorization: `Bearer ${key}` })

describe('agent keys', () => {
  it('are managed by staff only, and only a hash is stored', async () => {
    expect((await request(app).get('/api/admin/agent-keys')).status).toBe(401)
    expect((await (await registerAgent(app)).post('/api/admin/agent-keys').send({ name: 'x' })).status).toBe(403)

    const { admin, key } = await createKey()
    expect(key).toMatch(/^smk_/)
    const listed = await admin.get('/api/admin/agent-keys')
    expect(listed.body.keys).toHaveLength(1)
    expect(listed.body.keys[0]).toMatchObject({ name: 'Vesper phone agent', prefix: key.slice(0, 10), revokedAt: null })
    expect(JSON.stringify(listed.body)).not.toContain(key)
    const [row] = await db.select().from(agentKeys)
    expect(row!.keyHash).not.toBe(key)
  })

  it('refuse a wrong or revoked key, and leave requests without one unchanged', async () => {
    const { admin, key, id } = await createKey()
    expect((await request(app).get('/api/vehicles').set(withKey('smk_wrong'))).status).toBe(401)
    expect((await request(app).get('/api/vehicles').set(withKey(key))).status).toBe(200)
    expect((await request(app).get('/api/vehicles')).status).toBe(200)

    expect((await admin.delete(`/api/admin/agent-keys/${id}`)).status).toBe(200)
    expect((await request(app).get('/api/vehicles').set(withKey(key))).status).toBe(401)
  })

  it('mark the bookings the agent makes', async () => {
    const { key } = await createKey()
    const quote = await request(app).post('/api/quotes').send(quotePayload())
    const choice = quote.body.quote.options.find((option: { available: boolean }) => option.available)
    const response = await request(app).post('/api/bookings').set(withKey(key)).send({
      quoteId: quote.body.quote.id,
      vehicleId: choice.vehicleId,
      contact: CONTACT,
      paymentMethod: 'chauffeur',
      acceptTerms: true,
      locale: 'en',
    })
    expect(response.status).toBe(201)
    const [row] = await db.select().from(bookings).where(eq(bookings.reference, response.body.booking.reference))
    expect(row!.source).toBe('agent')

    const { response: website } = await bookRide(app)
    expect(website.body.booking.source).toBe('website')
  })
})

describe('the agent-only endpoints', () => {
  it('need the key', async () => {
    expect((await request(app).get('/api/agent/bookings').query({ phone: '+34600111222' })).status).toBe(401)
  })

  it('list the upcoming bookings of a phone number, written any way', async () => {
    const { key } = await createKey()
    await bookRide(app)
    const mine = await request(app).get('/api/agent/bookings').set(withKey(key)).query({ phone: '0034 600 111 222' })
    expect(mine.status).toBe(200)
    expect(mine.body.bookings).toHaveLength(1)
    expect(mine.body.bookings[0].contact.name).toBe(CONTACT.name)

    const someoneElse = await request(app).get('/api/agent/bookings').set(withKey(key)).query({ phone: '+34 699 000 000' })
    expect(someoneElse.body.bookings).toEqual([])
  })
})
