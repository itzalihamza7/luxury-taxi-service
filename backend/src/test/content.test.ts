import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { count, eq } from 'drizzle-orm'
import request from 'supertest'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../db/client.js'
import { startingContent } from '../db/content/index.js'
import { INITIAL_FLEET } from '../db/fleet.js'
import { CONTENT_COLLECTIONS, contentEntries, vehicles } from '../db/schema.js'
import { seed } from '../db/seed.js'
import { adminAgent, buildApp, registerAgent, resetDatabase } from './helpers.js'

const app = buildApp()

beforeEach(resetDatabase)

const total = async (collection: (typeof CONTENT_COLLECTIONS)[number]) =>
  (await db.select({ total: count() }).from(contentEntries).where(eq(contentEntries.collection, collection)))[0]?.total ?? 0

const faqPayload = (overrides: Record<string, unknown> = {}) => ({
  data: {
    question: { en: 'Do you carry child seats?', es: '¿Llevan sillas infantiles?' },
    answer: { en: 'Yes, on request and at no extra cost.', es: 'Sí, bajo petición y sin coste adicional.' },
    featured: true,
  },
  ...overrides,
})

const eventPayload = (overrides: Record<string, unknown> = {}, data: Record<string, unknown> = {}) => ({
  data: {
    category: { en: 'Music festival', es: 'Festival de música' },
    title: { en: 'Mad Cool Festival', es: 'Mad Cool Festival' },
    venue: 'Iberdrola Music',
    placeId: null,
    start: '2027-07-08',
    end: '2027-07-10',
    summary: { en: 'Three nights of concerts in the south of the city.', es: 'Tres noches de conciertos en el sur de la ciudad.' },
    heading: { en: 'Mad Cool, *home by car*', es: 'Mad Cool, *de vuelta en coche*' },
    body: { en: ['The last metro leaves before the headliners finish.'], es: ['El último metro sale antes de que acaben los cabezas de cartel.'] },
    tips: { en: ['Agree a pickup point away from the main gate'], es: ['Acuerde un punto de recogida lejos de la puerta principal'] },
    ...data,
  },
  ...overrides,
})

describe('starting content', () => {
  it('fills every collection once, and never twice', async () => {
    await seed()
    const starting = startingContent()
    for (const collection of CONTENT_COLLECTIONS) {
      expect(starting[collection].length).toBeGreaterThan(0)
      expect(await total(collection)).toBe(starting[collection].length)
    }

    await seed()
    expect(await total('faq')).toBe(starting.faq.length)
    // The fleet already in place is left alone.
    expect((await db.select({ total: count() }).from(vehicles))[0]?.total).toBe(7)
  })

  it('does not bring back what the operator deleted', async () => {
    await seed()
    await db.delete(contentEntries).where(eq(contentEntries.collection, 'faq'))
    await db.delete(vehicles)
    await seed()
    expect(await total('faq')).toBe(0)
    expect((await db.select({ total: count() }).from(vehicles))[0]?.total).toBe(0)
  })

  it('only points at pictures that ship with the website', () => {
    const publicFolder = fileURLToPath(new URL('../../../frontend/public', import.meta.url))
    // The API can be tested on its own, without the website's files beside it.
    if (!existsSync(publicFolder)) return

    const pictures = [
      ...INITIAL_FLEET.map((vehicle) => vehicle.imageUrl),
      ...Object.values(startingContent()).flatMap((entries) => entries.map((entry) => entry.data.image as string | null | undefined)),
    ].filter((picture): picture is string => Boolean(picture))
    expect(pictures.length).toBeGreaterThan(15)
    for (const picture of pictures) expect(existsSync(`${publicFolder}${picture}`), `${picture} is missing`).toBe(true)
  })

  it('serves the business details even before they are saved', async () => {
    const response = await request(app).get('/api/content/settings')
    expect(response.body.settings).toMatchObject({ phone: '+34 900 000 000', reviewsAreSamples: true })
  })
})

describe('reading content', () => {
  it('returns published entries in their order, with the fields flattened', async () => {
    await seed()
    const response = await request(app).get('/api/content/route')
    expect(response.status).toBe(200)
    expect(response.body.entries.map((entry: { slug: string }) => entry.slug)).toEqual(['madrid-to-toledo', 'madrid-to-segovia', 'madrid-to-avila', 'madrid-to-el-escorial'])
    expect(response.body.entries[0]).toMatchObject({ km: 73, city: { en: 'Toledo' }, image: '/images/routes/toledo.jpg' })
    // Questions are kept per language.
    expect(response.body.entries[0].faqs.en[0].question).toBeTypeOf('string')
    expect(response.body.entries[0].published).toBeUndefined()

    // Legal texts carry placeholders for the business details.
    const legal = await request(app).get('/api/content/legal')
    expect(JSON.stringify(legal.body.entries)).toContain('{companyName}')
  })

  it('hides unpublished entries and unknown collections', async () => {
    const admin = await adminAgent(app)
    await admin.post('/api/admin/content/faq').send(faqPayload())
    await admin.post('/api/admin/content/faq').send(faqPayload({ published: false }))
    expect((await request(app).get('/api/content/faq')).body.entries).toHaveLength(1)
    expect((await admin.get('/api/admin/content/faq')).body.entries).toHaveLength(2)

    expect((await request(app).get('/api/content/users')).status).toBe(404)
    expect((await admin.get('/api/admin/content/users')).status).toBe(404)
  })
})

describe('managing content', () => {
  it('is for operators only', async () => {
    const paths = ['/api/admin/content/faq', '/api/admin/settings', '/api/admin/places']
    for (const path of paths) expect((await request(app).get(path)).status).toBe(401)
    const customer = await registerAgent(app)
    for (const path of paths) expect((await customer.get(path)).status).toBe(403)
    expect((await customer.post('/api/admin/content/faq').send(faqPayload())).status).toBe(403)
    expect((await customer.put('/api/admin/settings').send({})).status).toBe(403)
  })

  it('adds, edits, reorders and deletes entries', async () => {
    const admin = await adminAgent(app)
    const first = await admin.post('/api/admin/content/faq').send(faqPayload({ sortOrder: 20 }))
    expect(first.status).toBe(201)
    expect(first.body.entry).toMatchObject({ slug: 'faq', sortOrder: 20, published: true })
    const second = (await admin.post('/api/admin/content/faq').send(faqPayload({ sortOrder: 10, data: { ...faqPayload().data, question: { en: 'Second', es: 'Segunda' } } }))).body.entry as { id: string; slug: string }
    expect(second.slug).toBe('faq-2')

    const order = async () => ((await request(app).get('/api/content/faq')).body.entries as { question: { en: string } }[]).map((entry) => entry.question.en)
    expect(await order()).toEqual(['Second', 'Do you carry child seats?'])

    const edited = await admin.put(`/api/admin/content/faq/${second.id}`).send(faqPayload({ sortOrder: 30, data: { ...faqPayload().data, question: { en: 'Edited', es: 'Editada' } } }))
    expect(edited.body.entry).toMatchObject({ slug: 'faq-2', sortOrder: 30 })
    expect(await order()).toEqual(['Do you carry child seats?', 'Edited'])

    expect((await admin.delete(`/api/admin/content/faq/${second.id}`)).status).toBe(200)
    expect(await order()).toEqual(['Do you carry child seats?'])
    expect((await admin.delete(`/api/admin/content/faq/${second.id}`)).status).toBe(404)
    expect((await admin.put('/api/admin/content/faq/not-an-id').send(faqPayload())).status).toBe(404)
    // An entry cannot be reached through another collection's address.
    expect((await admin.delete(`/api/admin/content/event/${String(first.body.entry.id)}`)).status).toBe(404)
  })

  it('makes the page address from the title, and keeps addresses unique', async () => {
    const admin = await adminAgent(app)
    const created = await admin.post('/api/admin/content/event').send(eventPayload())
    expect(created.status).toBe(201)
    expect(created.body.entry.slug).toBe('mad-cool-festival')
    expect((await admin.post('/api/admin/content/event').send(eventPayload())).body.entry.slug).toBe('mad-cool-festival-2')

    const taken = await admin.post('/api/admin/content/event').send(eventPayload({ slug: 'mad-cool-festival' }))
    expect(taken.status).toBe(409)
    expect(taken.body.error).toMatchObject({ code: 'SLUG_TAKEN', fields: { slug: 'taken' } })

    // Renaming to an address another entry uses is refused; keeping its own is fine.
    const id = created.body.entry.id as string
    expect((await admin.put(`/api/admin/content/event/${id}`).send(eventPayload({ slug: 'mad-cool-festival-2' }))).status).toBe(409)
    expect((await admin.put(`/api/admin/content/event/${id}`).send(eventPayload({ slug: 'mad-cool-festival' }))).status).toBe(200)

    const shown = (await request(app).get('/api/content/event')).body.entries as { slug: string }[]
    expect(shown[0]).toMatchObject({ slug: 'mad-cool-festival', category: { es: 'Festival de música' } })
  })

  it('checks each kind of content against its own rules', async () => {
    const admin = await adminAgent(app)

    const event = await admin.post('/api/admin/content/event').send(eventPayload({}, { title: { en: 'Only English', es: '' }, end: '2027-07-01', start: '2027-07-08' }))
    expect(event.status).toBe(400)
    expect(event.body.error.fields).toMatchObject({ 'data.title.es': 'required', 'data.end': 'before_start' })

    const dates = await admin.post('/api/admin/content/event').send(eventPayload({}, { start: '2027-02-30', category: { en: 'Opera' } }))
    expect(dates.body.error.fields).toMatchObject({ 'data.start': 'invalid_date', 'data.category.es': 'required' })

    const article = await admin.post('/api/admin/content/article').send({
      data: {
        date: '2026-10-01',
        minutes: 3,
        category: { en: 'Guides', es: 'Guías' },
        title: { en: 'A title', es: 'Un título' },
        excerpt: { en: 'An excerpt.', es: 'Un extracto.' },
        body: { en: [{ paragraphs: ['Text.'] }], es: [] },
        cta: { href: 'https://elsewhere.example', label: { en: 'Go', es: 'Ir' } },
      },
    })
    expect(article.status).toBe(400)
    expect(article.body.error.fields).toMatchObject({ 'data.cta.href': 'invalid_link', 'data.body.es': 'too_small' })

    expect((await admin.post('/api/admin/content/faq').send({ data: {} })).body.error.fields).toMatchObject({ 'data.question': 'required' })
    expect((await admin.post('/api/admin/content/faq').send(faqPayload({ slug: 'Bad Slug', sortOrder: -1 }))).body.error.fields).toMatchObject({ slug: 'invalid_slug', sortOrder: 'too_small' })
  })

  it('accepts long texts', async () => {
    const admin = await adminAgent(app)
    const paragraph = 'Legal text. '.repeat(300)
    const sections = Array.from({ length: 12 }, (_, index) => ({ heading: `${index + 1}. Section`, paragraphs: [paragraph, paragraph] }))
    const response = await admin.post('/api/admin/content/legal').send({
      data: { title: { en: 'Refund policy', es: 'Política de reembolso' }, summary: { en: 'How refunds work.', es: 'Cómo funcionan los reembolsos.' }, updated: '2026-10-13', sections: { en: sections, es: sections } },
    })
    expect(JSON.stringify(sections).length).toBeGreaterThan(80_000)
    expect(response.status).toBe(201)
    expect(response.body.entry.slug).toBe('refund-policy')
  })

  it('lists the places an entry can point at', async () => {
    const admin = await adminAgent(app)
    const places = (await admin.get('/api/admin/places')).body.places as { id: string; name: { en: string } }[]
    expect(places.find((place) => place.id === 'cat:ifema')?.name.en).toContain('IFEMA')
    expect(places.some((place) => place.id === 'cat:toledo')).toBe(true)
  })
})

describe('business details', () => {
  const details = {
    phone: '+34 911 222 333',
    whatsapp: '34611222333',
    email: 'Reservas@Example.com',
    social: { instagram: 'https://instagram.com/example', facebook: '', tripadvisor: '', google: '' },
    legal: { companyName: 'Example Chauffeurs SL', taxId: 'B12345678', address: 'Calle Mayor 1, 28013 Madrid', registry: 'Registro Mercantil de Madrid', licence: 'VTC-M-0000' },
    reviewsAreSamples: false,
    linkBookingsOnSignup: true,
  }

  it('saves them for the whole website', async () => {
    const admin = await adminAgent(app)
    const saved = await admin.put('/api/admin/settings').send(details)
    expect(saved.status).toBe(200)
    // The email is normalised like every other email in the system.
    expect(saved.body.settings.email).toBe('reservas@example.com')

    const shown = (await request(app).get('/api/content/settings')).body.settings
    expect(shown).toMatchObject({ phone: '+34 911 222 333', whatsapp: '34611222333', reviewsAreSamples: false, legal: { taxId: 'B12345678' } })
    expect((await admin.get('/api/admin/settings')).body.settings.social.instagram).toBe('https://instagram.com/example')
  })

  it('rejects details that would break links', async () => {
    const admin = await adminAgent(app)
    const response = await admin.put('/api/admin/settings').send({
      ...details,
      phone: 'call us',
      whatsapp: '+34 611 222 333',
      email: 'not-an-email',
      social: { ...details.social, instagram: 'http://instagram.com/example', facebook: 'javascript:alert(1)' },
      legal: { ...details.legal, companyName: '' },
    })
    expect(response.status).toBe(400)
    expect(response.body.error.fields).toMatchObject({
      phone: 'invalid_phone',
      whatsapp: 'invalid_phone',
      email: 'invalid_email',
      'social.instagram': 'invalid_link',
      'social.facebook': 'invalid_link',
      'legal.companyName': 'required',
    })
    // Nothing was saved.
    expect((await request(app).get('/api/content/settings')).body.settings.phone).toBe('+34 900 000 000')
  })
})
