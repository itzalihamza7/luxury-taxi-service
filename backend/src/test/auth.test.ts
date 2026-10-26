import { eq } from 'drizzle-orm'
import request from 'supertest'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../db/client.js'
import { sessions, users } from '../db/schema.js'
import { buildApp, registerAgent, resetDatabase } from './helpers.js'

const app = buildApp()
const VALID = { name: 'Carla Ruiz', email: 'carla@example.com', password: 'correct-horse-9', phone: '+34 600 333 444' }

beforeEach(resetDatabase)

describe('registration', () => {
  it('creates an account, signs the user in and never stores the password', async () => {
    const agent = request.agent(app)
    const response = await agent.post('/api/auth/register').send(VALID)

    expect(response.status).toBe(201)
    expect(response.body.user).toMatchObject({ name: 'Carla Ruiz', email: 'carla@example.com', phone: '+34 600 333 444', role: 'customer' })
    expect(response.body.user).not.toHaveProperty('passwordHash')

    const [stored] = await db.select().from(users).where(eq(users.email, 'carla@example.com'))
    expect(stored?.passwordHash.startsWith('scrypt$')).toBe(true)
    expect(stored?.passwordHash).not.toContain(VALID.password)

    const me = await agent.get('/api/auth/me')
    expect(me.body.user.email).toBe('carla@example.com')
  })

  it('sets an HttpOnly, SameSite=Lax session cookie and stores only a hash of it', async () => {
    const response = await request(app).post('/api/auth/register').send(VALID)
    const cookie = String(response.headers['set-cookie'])

    expect(cookie).toMatch(/^sid=[\w-]{40,};/)
    expect(cookie).toContain('HttpOnly')
    expect(cookie).toContain('SameSite=Lax')
    expect(cookie).not.toContain('Secure')

    const token = /^sid=([\w-]+);/.exec(cookie)?.[1]
    const [session] = await db.select().from(sessions)
    expect(session?.tokenHash).toMatch(/^[0-9a-f]{64}$/)
    expect(session?.tokenHash).not.toBe(token)
  })

  it('marks the cookie Secure when the site is served over HTTPS', async () => {
    const response = await request(app).post('/api/auth/register').set('X-Forwarded-Proto', 'https').send(VALID)
    expect(String(response.headers['set-cookie'])).toContain('Secure')
  })

  it('normalises the email and rejects a duplicate regardless of case', async () => {
    await request(app).post('/api/auth/register').send({ ...VALID, email: '  Carla@Example.COM ' })
    const duplicate = await request(app).post('/api/auth/register').send({ ...VALID, email: 'CARLA@example.com' })

    expect(duplicate.status).toBe(409)
    expect(duplicate.body.error.code).toBe('EMAIL_TAKEN')
    expect(await db.select().from(users)).toHaveLength(1)
  })

  it('accepts a registration without a phone number', async () => {
    const response = await request(app).post('/api/auth/register').send({ ...VALID, phone: '' })
    expect(response.status).toBe(201)
    expect(response.body.user.phone).toBeNull()
  })

  it.each([
    [{ password: 'short' }, 'password', 'too_short'],
    [{ email: 'not-an-email' }, 'email', 'invalid_email'],
    [{ email: '' }, 'email', 'required'],
    [{ name: 'A' }, 'name', 'too_short'],
    [{ phone: 'call me' }, 'phone', 'invalid_phone'],
  ])('rejects %j with a field error', async (override, field, code) => {
    const response = await request(app).post('/api/auth/register').send({ ...VALID, ...override })
    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe('VALIDATION')
    expect(response.body.error.fields[field]).toBe(code)
  })
})

describe('login and logout', () => {
  beforeEach(async () => {
    await request(app).post('/api/auth/register').send(VALID)
  })

  it('signs in with the right credentials (email is case-insensitive)', async () => {
    const agent = request.agent(app)
    const response = await agent.post('/api/auth/login').send({ email: 'CARLA@example.com', password: VALID.password })
    expect(response.status).toBe(200)
    expect((await agent.get('/api/auth/me')).body.user.email).toBe('carla@example.com')
  })

  it('gives the same answer for a wrong password and an unknown email', async () => {
    const wrongPassword = await request(app).post('/api/auth/login').send({ email: VALID.email, password: 'wrong-password' })
    const unknownEmail = await request(app).post('/api/auth/login').send({ email: 'nobody@example.com', password: VALID.password })

    expect(wrongPassword.status).toBe(401)
    expect(unknownEmail.status).toBe(401)
    expect(wrongPassword.body).toEqual(unknownEmail.body)
    expect(wrongPassword.body.error.code).toBe('INVALID_CREDENTIALS')
    expect(wrongPassword.headers['set-cookie']).toBeUndefined()
  })

  it('logging out ends the session on the server', async () => {
    const agent = request.agent(app)
    const login = await agent.post('/api/auth/login').send({ email: VALID.email, password: VALID.password })
    const cookie = String(login.headers['set-cookie']).split(';')[0] ?? ''

    await agent.post('/api/auth/logout')
    expect((await agent.get('/api/auth/me')).body.user).toBeNull()

    // Replaying the old cookie no longer works.
    const replay = await request(app).get('/api/auth/me').set('Cookie', cookie)
    expect(replay.body.user).toBeNull()
  })

  it('ignores an expired session', async () => {
    const agent = request.agent(app)
    await agent.post('/api/auth/login').send({ email: VALID.email, password: VALID.password })
    await db.update(sessions).set({ expiresAt: new Date(Date.now() - 1000) })
    expect((await agent.get('/api/auth/me')).body.user).toBeNull()
  })
})

describe('profile', () => {
  it('answers quietly with no user when signed out', async () => {
    const response = await request(app).get('/api/auth/me')
    expect(response.status).toBe(200)
    expect(response.body).toEqual({ user: null })
  })

  it('requires a session to update the profile', async () => {
    const response = await request(app).patch('/api/auth/me').send({ name: 'Someone Else' })
    expect(response.status).toBe(401)
    expect(response.body.error.code).toBe('UNAUTHENTICATED')
  })

  it('updates name and phone', async () => {
    const agent = await registerAgent(app)
    const response = await agent.patch('/api/auth/me').send({ name: 'Carla R. Gómez', phone: '' })
    expect(response.status).toBe(200)
    expect(response.body.user).toMatchObject({ name: 'Carla R. Gómez', phone: null })
  })
})

describe('api basics', () => {
  it('reports health', async () => {
    expect((await request(app).get('/api/health')).body).toEqual({ status: 'ok' })
  })

  it('exposes the booking settings without secrets', async () => {
    const response = await request(app).get('/api/config')
    expect(response.body).toMatchObject({ currency: 'EUR', timeZone: 'Europe/Madrid', minLeadMinutes: 120, freeCancelHours: 24, onlinePayments: false })
    expect(JSON.stringify(response.body)).not.toMatch(/secret|password|database/i)
  })

  it('answers unknown routes and malformed JSON with JSON errors', async () => {
    const missing = await request(app).get('/api/nope')
    expect(missing.status).toBe(404)
    expect(missing.body.error.code).toBe('NOT_FOUND')

    const malformed = await request(app).post('/api/auth/login').set('Content-Type', 'application/json').send('{"email":')
    expect(malformed.status).toBe(400)
    expect(malformed.body.error.code).toBe('INVALID_JSON')
  })

  it('ignores bodies that are not JSON (as a cross-site form post would be)', async () => {
    const response = await request(app).post('/api/auth/login').type('form').send({ email: VALID.email, password: VALID.password })
    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe('VALIDATION')
  })

  it('lists the fleet with public fields only', async () => {
    const response = await request(app).get('/api/vehicles')
    // The price list of 26 October 2026: six vehicles on the website, the V-Class VIP and Yaris hidden.
    expect(response.body.vehicles).toHaveLength(6)
    expect(response.body.vehicles[0]).toMatchObject({ slug: 'mercedes-e-class', passengers: 3, luggage: 2, fromCents: 9000 })
    expect(response.body.vehicles[0]).not.toHaveProperty('perKmCents')

    const one = await request(app).get('/api/vehicles/mercedes-sprinter')
    expect(one.body.vehicle).toMatchObject({ name: 'Mercedes-Benz Sprinter', passengers: 16 })
    expect((await request(app).get('/api/vehicles/unknown')).status).toBe(404)
  })

  it('suggests places from the catalogue', async () => {
    const quickPicks = await request(app).get('/api/places')
    expect(quickPicks.body.places.length).toBeGreaterThan(5)

    const search = await request(app).get('/api/places').query({ q: 'tole', locale: 'es' })
    expect(search.body.places[0]).toMatchObject({ id: 'cat:toledo', label: 'Toledo', kind: 'city' })
  })
})

describe('sign-in throttling per account', () => {
  it('locks an account after 10 failed attempts, even from different addresses', async () => {
    const limited = buildApp({ RATE_LIMIT_DISABLED: false })
    await registerAgent(limited, 'target@example.com', 'right-password-1')
    const attempt = (password: string, n: number) =>
      request(limited).post('/api/auth/login').set('X-Forwarded-For', `203.0.113.${n}`).send({ email: 'target@example.com', password })

    for (let n = 1; n <= 10; n += 1) expect((await attempt('wrong-password', n)).status).toBe(401)
    // Now even the right password is refused for a while.
    const locked = await attempt('right-password-1', 11)
    expect(locked.status).toBe(429)
    expect(locked.body.error.code).toBe('RATE_LIMITED')
    // Other accounts are not affected.
    await registerAgent(limited, 'other@example.com', 'other-password-1')
    expect((await request(limited).post('/api/auth/login').set('X-Forwarded-For', '203.0.113.99').send({ email: 'other@example.com', password: 'other-password-1' })).status).toBe(200)
  })
})
