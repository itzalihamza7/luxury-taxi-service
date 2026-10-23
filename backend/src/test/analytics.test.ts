import request from 'supertest'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../db/client.js'
import { whatsappClicks } from '../db/schema.js'
import { parseUserAgent } from '../lib/user-agent.js'
import { adminAgent, buildApp, registerAgent, resetDatabase } from './helpers.js'

const app = buildApp()

const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.2 Mobile/15E148 Safari/604.1'
const WINDOWS_EDGE = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0'

const click = (userAgent = IPHONE, body: Record<string, unknown> = { page: '/es/fleet' }) =>
  request(app).post('/api/track/whatsapp').set('User-Agent', userAgent).set('Accept-Language', 'es-ES,es;q=0.9').send(body)

beforeEach(resetDatabase)

describe('WhatsApp click tracking', () => {
  it('records the page, device and language, and no IP address', async () => {
    expect((await click()).status).toBe(204)
    const [row] = await db.select().from(whatsappClicks)
    expect(row).toMatchObject({ page: '/es/fleet', deviceType: 'mobile', os: 'iOS 18.2', browser: 'Safari', language: 'es-ES', isNew: true })
    // Without a location database the place is simply unknown.
    expect(row).toMatchObject({ country: null, city: null })
    expect(JSON.stringify(row)).not.toMatch(/127\.0\.0\.1|::1/)
    expect(row?.visitor).toMatch(/^[0-9a-f]{32}$/)
  })

  it('counts a visitor as new only on their first click of the day', async () => {
    await click()
    await click()
    await click(WINDOWS_EDGE)
    const rows = await db.select().from(whatsappClicks).orderBy(whatsappClicks.createdAt)
    expect(rows.map((row) => row.isNew)).toEqual([true, false, true])
    expect(rows[2]).toMatchObject({ deviceType: 'desktop', os: 'Windows', browser: 'Edge' })
  })

  it('ignores bots and rejects malformed reports', async () => {
    expect((await click('Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)')).status).toBe(204)
    expect((await click(IPHONE, { page: 'https://elsewhere.example' })).status).toBe(400)
    expect(await db.select().from(whatsappClicks)).toHaveLength(0)
  })

  it('deletes clicks older than a year', async () => {
    await db.insert(whatsappClicks).values({ visitor: 'old', isNew: true, page: '/en', deviceType: 'desktop', createdAt: new Date(Date.now() - 400 * 86_400_000) })
    await click()
    const rows = await db.select().from(whatsappClicks)
    expect(rows.map((row) => row.visitor)).not.toContain('old')
  })

  it('shows the clicks to administrators only, without the visitor hash', async () => {
    await click()
    await click()
    await click(WINDOWS_EDGE, { page: '/en/contact', referrer: 'instagram.com' })

    expect((await request(app).get('/api/admin/whatsapp-clicks')).status).toBe(401)
    expect((await (await registerAgent(app)).get('/api/admin/whatsapp-clicks')).status).toBe(403)

    const response = await (await adminAgent(app)).get('/api/admin/whatsapp-clicks')
    expect(response.status).toBe(200)
    expect(response.body.total).toBe(3)
    expect(response.body.summary.last7Days).toEqual({ clicks: 3, visitors: 2 })
    expect(response.body.summary.devices).toEqual({ mobile: 1, desktop: 1 })
    expect(response.body.clicks[0]).toMatchObject({ page: '/en/contact', referrer: 'instagram.com' })
    expect(response.body.clicks[0].visitor).toBeUndefined()
  })
})

describe('user agent parsing', () => {
  it.each([
    [IPHONE, false, { deviceType: 'mobile', os: 'iOS 18.2', browser: 'Safari' }],
    ['Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36', false, { deviceType: 'mobile', os: 'Android 15', browser: 'Chrome' }],
    ['Mozilla/5.0 (Linux; Android 14; SM-X710) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', false, { deviceType: 'tablet', os: 'Android 14', browser: 'Chrome' }],
    ['Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.2 Safari/605.1.15', true, { deviceType: 'tablet', os: 'iPadOS', browser: 'Safari' }],
    ['Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.2 Safari/605.1.15', false, { deviceType: 'desktop', os: 'macOS', browser: 'Safari' }],
    ['Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 350.0.0', false, { deviceType: 'mobile', os: 'iOS 18.1', browser: 'Instagram app' }],
    [WINDOWS_EDGE, false, { deviceType: 'desktop', os: 'Windows', browser: 'Edge' }],
  ] as const)('%s', (userAgent, touch, expected) => {
    expect(parseUserAgent(userAgent, touch)).toEqual(expected)
  })
})
