import { sql } from 'drizzle-orm'
import request from 'supertest'
import { createApp } from '../app.js'
import type { Email } from '../lib/mailer.js'
import { loadConfig, type Config } from '../config.js'
import { db } from '../db/client.js'
import { INITIAL_FLEET } from '../db/fleet.js'
import { users, vehicles } from '../db/schema.js'
import { hashPassword } from '../lib/password.js'

export const TIME_ZONE = 'Europe/Madrid'

/** Build the app with the test environment, optionally overriding settings. */
export function buildApp(overrides: Partial<Config> = {}, dependencies: Parameters<typeof createApp>[1] = {}) {
  return createApp({ ...loadConfig(), ...overrides }, dependencies)
}

/** A mailer that keeps what it was asked to send, for tests to read. */
export function memoryMailer() {
  const sent: Email[] = []
  return { sent, mailer: { send: async (email: Email) => void sent.push(email) } }
}

/** Empty every table and restore the starting fleet. Call in `beforeEach`. */
export async function resetDatabase(): Promise<void> {
  await db.execute(
    sql`truncate table bookings, quotes, sessions, users, contact_messages, newsletter_subscribers, vehicles, content_entries, settings, media, whatsapp_clicks, password_resets restart identity cascade`,
  )
  await db.insert(vehicles).values(INITIAL_FLEET)
}

export async function createAdmin(email = 'ops@example.com', password = 'admin-password-1'): Promise<{ email: string; password: string }> {
  await db.insert(users).values({ email, name: 'Operations', role: 'admin', passwordHash: await hashPassword(password) })
  return { email, password }
}

/** Local calendar date and time in the business time zone, `daysAhead` days from now. */
export function localDateTime(daysAhead: number, time = '10:00'): { date: string; time: string } {
  const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' })
  return { date: formatter.format(new Date(Date.now() + daysAhead * 86_400_000)), time }
}

export const PLACES = {
  sol: { label: 'Puerta del Sol, Madrid', lat: 40.4169, lng: -3.7035 },
  airport: { label: 'Madrid–Barajas Airport · T4', lat: 40.4917, lng: -3.5931 },
  toledo: { label: 'Toledo', lat: 39.8628, lng: -4.0273 },
  paris: { label: 'Paris', lat: 48.8566, lng: 2.3522 },
} as const

/** A valid one-way quote request, three days ahead. */
export function quotePayload(overrides: Record<string, unknown> = {}) {
  const when = localDateTime(3)
  return {
    rideType: 'one_way',
    pickup: PLACES.airport,
    dropoff: PLACES.sol,
    pickupDate: when.date,
    pickupTime: when.time,
    adults: 2,
    children: 0,
    luggage: 2,
    ...overrides,
  }
}

export const CONTACT = { name: 'Elena Marín', email: 'elena@example.com', phone: '+34 600 111 222' }

type App = ReturnType<typeof buildApp>
type Agent = ReturnType<typeof request.agent>

interface QuoteOptionBody {
  vehicleId: string
  available: boolean
  totalCents: number
  vehicle: { slug: string; passengers: number }
}

export async function requestQuote(app: App, overrides: Record<string, unknown> = {}) {
  const response = await request(app).post('/api/quotes').send(quotePayload(overrides))
  if (response.status !== 201) throw new Error(`quote failed: ${response.status} ${JSON.stringify(response.body)}`)
  return response.body.quote as { id: string; options: QuoteOptionBody[]; route: { distanceM: number } | null }
}

/** Quote + book the first available vehicle. Pass an agent to book as a signed-in customer. */
export async function bookRide(
  app: App,
  options: { agent?: Agent; quote?: Record<string, unknown>; booking?: Record<string, unknown> } = {},
) {
  const quote = await requestQuote(app, options.quote)
  const choice = quote.options.find((option) => option.available)
  if (!choice) throw new Error('no vehicle available for the test quote')

  const client = options.agent ?? request(app)
  const response = await client.post('/api/bookings').send({
    quoteId: quote.id,
    vehicleId: choice.vehicleId,
    contact: CONTACT,
    paymentMethod: 'chauffeur',
    acceptTerms: true,
    locale: 'en',
    ...options.booking,
  })
  return { response, quote, choice }
}

export async function registerAgent(app: App, email = 'client@example.com', password = 'correct-horse-9') {
  const agent = request.agent(app)
  const response = await agent.post('/api/auth/register').send({ name: 'Carla Ruiz', email, password, phone: '+34 600 333 444' })
  if (response.status !== 201) throw new Error(`register failed: ${response.status} ${JSON.stringify(response.body)}`)
  return agent
}

export async function adminAgent(app: App) {
  const credentials = await createAdmin()
  const agent = request.agent(app)
  const response = await agent.post('/api/auth/login').send(credentials)
  if (response.status !== 200) throw new Error(`admin login failed: ${response.status}`)
  return agent
}
