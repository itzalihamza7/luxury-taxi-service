import { createHmac, randomBytes } from 'node:crypto'
import { and, count, desc, eq, gte, isNotNull, lt, sql } from 'drizzle-orm'
import { Router } from 'express'
import { z } from 'zod'
import type { AppContext } from '../../context.js'
import { db } from '../../db/client.js'
import { settings, whatsappClicks, type WhatsappClick } from '../../db/schema.js'
import { parse } from '../../lib/validate.js'
import { isBot, parseUserAgent } from '../../lib/user-agent.js'
import { locate } from './geo.js'

/** Clicks are kept for a year, then deleted. */
const RETENTION_DAYS = 365

const clickSchema = z.object({
  /** Path of the page the link was on, e.g. `/es/fleet`. */
  page: z.string().trim().max(300).regex(/^\//),
  /** Host of the site the visitor came from, if another one. */
  referrer: z.string().trim().max(200).nullish(),
  touch: z.boolean().optional(),
})

const listSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
})

let secret: Promise<Buffer> | null = null

/** A random key, created once and kept in the database, behind the daily visitor hash. */
function visitorSecret(): Promise<Buffer> {
  secret ??= (async () => {
    const generated = randomBytes(32).toString('hex')
    await db.insert(settings).values({ key: 'visitor-secret', value: { secret: generated } }).onConflictDoNothing()
    const [row] = await db.select().from(settings).where(eq(settings.key, 'visitor-secret'))
    return Buffer.from(String(row?.value.secret ?? generated), 'hex')
  })().catch((error: unknown) => {
    secret = null
    throw error
  })
  return secret
}

/**
 * The same browser gets the same value all day and an unrelated one the next
 * day. Without the secret the value cannot be traced back to an address.
 */
async function visitorHash(ip: string, userAgent: string, day: string): Promise<string> {
  const dayKey = createHmac('sha256', await visitorSecret()).update(day).digest()
  return createHmac('sha256', dayKey).update(`${ip}|${userAgent}`).digest('hex').slice(0, 32)
}

/** Today's date where the business is, `YYYY-MM-DD`. */
const businessDay = (timeZone: string) => new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())

const serialize = ({ visitor: _visitor, ...click }: WhatsappClick) => ({ ...click, createdAt: click.createdAt.toISOString() })

/** Public: the website reports a click on one of its WhatsApp links. */
export function analyticsRouter({ config, rateLimit }: AppContext): Router {
  const router = Router()

  router.post('/whatsapp', rateLimit({ name: 'track', windowMs: 60_000, limit: 30 }), async (req, res) => {
    const input = parse(clickSchema, req.body ?? {})
    const userAgent = String(req.get('user-agent') ?? '').slice(0, 500)
    if (!userAgent || isBot(userAgent)) {
      res.status(204).end()
      return
    }

    const ip = req.ip ?? ''
    const visitor = await visitorHash(ip, userAgent, businessDay(config.BUSINESS_TIMEZONE))
    const [seen] = await db.select({ total: count() }).from(whatsappClicks).where(eq(whatsappClicks.visitor, visitor))
    const place = await locate(ip.replace(/^::ffff:/, ''), config.GEOIP_DB)
    const language = req.get('accept-language')?.split(',')[0]?.trim().slice(0, 20) || null

    await db.insert(whatsappClicks).values({
      visitor,
      isNew: (seen?.total ?? 0) === 0,
      page: input.page,
      referrer: input.referrer || null,
      language,
      ...place,
      ...parseUserAgent(userAgent, input.touch),
    })
    await db.delete(whatsappClicks).where(lt(whatsappClicks.createdAt, new Date(Date.now() - RETENTION_DAYS * 86_400_000)))
    res.status(204).end()
  })

  return router
}

/** Admin: the latest clicks, and counts for the last 7 and 30 days. */
export function analyticsAdminRouter(): Router {
  const router = Router()

  router.get('/whatsapp-clicks', async (req, res) => {
    const { page, pageSize } = parse(listSchema, req.query)
    const since = (days: number) => new Date(Date.now() - days * 86_400_000)
    const totals = (days: number) =>
      db
        .select({ clicks: count(), visitors: sql<number>`count(*) filter (where ${whatsappClicks.isNew})`.mapWith(Number) })
        .from(whatsappClicks)
        .where(gte(whatsappClicks.createdAt, since(days)))

    const [[all], [week], [month], countries, devices, rows] = await Promise.all([
      db.select({ total: count() }).from(whatsappClicks),
      totals(7),
      totals(30),
      db
        .select({ countryCode: whatsappClicks.countryCode, country: whatsappClicks.country, visitors: count() })
        .from(whatsappClicks)
        .where(and(gte(whatsappClicks.createdAt, since(30)), eq(whatsappClicks.isNew, true), isNotNull(whatsappClicks.country)))
        .groupBy(whatsappClicks.countryCode, whatsappClicks.country)
        .orderBy(desc(count()))
        .limit(5),
      db
        .select({ deviceType: whatsappClicks.deviceType, visitors: count() })
        .from(whatsappClicks)
        .where(and(gte(whatsappClicks.createdAt, since(30)), eq(whatsappClicks.isNew, true)))
        .groupBy(whatsappClicks.deviceType),
      db.select().from(whatsappClicks).orderBy(desc(whatsappClicks.createdAt)).limit(pageSize).offset((page - 1) * pageSize),
    ])

    res.json({
      summary: {
        last7Days: week ?? { clicks: 0, visitors: 0 },
        last30Days: month ?? { clicks: 0, visitors: 0 },
        countries,
        devices: Object.fromEntries(devices.map((row) => [row.deviceType, row.visitors])),
      },
      clicks: rows.map(serialize),
      total: all?.total ?? 0,
      page,
      pageSize,
    })
  })

  return router
}
