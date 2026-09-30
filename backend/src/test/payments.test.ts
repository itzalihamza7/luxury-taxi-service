import { createServer, type IncomingMessage, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { db } from '../db/client.js'
import { bookings } from '../db/schema.js'
import { bookRide, buildApp, CONTACT, resetDatabase } from './helpers.js'

/**
 * A stand-in for the PayPal REST API, shaped after PayPal's published OpenAPI
 * specification (Orders v2). It proves our requests and response handling are
 * consistent with that contract; it is not a substitute for a sandbox run.
 */
interface Recorded {
  method: string
  path: string
  headers: IncomingMessage['headers']
  body: string
}

const paypal = {
  server: undefined as Server | undefined,
  url: '',
  requests: [] as Recorded[],
  orders: new Map<string, { value: string; currency: string }>(),
  /** Overrides for the next responses. */
  failCreate: false,
  captureStatus: 'COMPLETED',
  captureAmount: null as string | null,
}

const readBody = (req: IncomingMessage) =>
  new Promise<string>((resolve) => {
    let data = ''
    req.on('data', (chunk) => (data += chunk))
    req.on('end', () => resolve(data))
  })

beforeAll(async () => {
  const { orders } = paypal

  paypal.server = createServer(async (req, res) => {
    const body = await readBody(req)
    const path = req.url ?? ''
    paypal.requests.push({ method: req.method ?? '', path, headers: req.headers, body })
    const json = (status: number, payload: unknown) => {
      res.writeHead(status, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify(payload))
    }

    if (path === '/v1/oauth2/token') {
      const expected = `Basic ${Buffer.from('test-client:test-secret').toString('base64')}`
      if (req.headers.authorization !== expected) return json(401, { error: 'invalid_client' })
      return json(200, { access_token: 'stub-token', token_type: 'Bearer', expires_in: 32_400 })
    }

    if (req.headers.authorization !== 'Bearer stub-token') return json(401, { name: 'AUTHENTICATION_FAILURE' })

    if (path === '/v2/checkout/orders') {
      if (paypal.failCreate) return json(422, { name: 'UNPROCESSABLE_ENTITY' })
      const order = JSON.parse(body)
      const id = `ORDER${orders.size + 1}ABC`
      orders.set(id, { value: order.purchase_units[0].amount.value, currency: order.purchase_units[0].amount.currency_code })
      return json(200, {
        id,
        status: 'PAYER_ACTION_REQUIRED',
        links: [
          { href: `${paypal.url}/v2/checkout/orders/${id}`, rel: 'self', method: 'GET' },
          { href: `https://www.sandbox.paypal.com/checkoutnow?token=${id}`, rel: 'payer-action', method: 'GET' },
        ],
      })
    }

    const capture = /^\/v2\/checkout\/orders\/([^/]+)\/capture$/.exec(path)
    if (capture) {
      const order = orders.get(capture[1] ?? '')
      if (!order) return json(404, { name: 'RESOURCE_NOT_FOUND' })
      return json(201, {
        id: capture[1],
        status: paypal.captureStatus,
        purchase_units: [
          {
            payments: {
              captures: [
                { id: 'CAPTURE1', status: paypal.captureStatus, amount: { currency_code: order.currency, value: paypal.captureAmount ?? order.value } },
              ],
            },
          },
        ],
      })
    }

    return json(404, { name: 'NOT_FOUND' })
  })

  await new Promise<void>((resolve) => paypal.server!.listen(0, '127.0.0.1', resolve))
  paypal.url = `http://127.0.0.1:${(paypal.server.address() as AddressInfo).port}`
})

afterAll(() => paypal.server?.close())

beforeEach(async () => {
  await resetDatabase()
  paypal.requests.length = 0
  paypal.orders.clear()
  paypal.failCreate = false
  paypal.captureStatus = 'COMPLETED'
  paypal.captureAmount = null
})

const appWithPayPal = () =>
  buildApp({ PAYPAL_CLIENT_ID: 'test-client', PAYPAL_CLIENT_SECRET: 'test-secret', PAYPAL_API_BASE: paypal.url, APP_URL: 'https://chauffeurs.example/' })

const pathsCalled = () => paypal.requests.map((entry) => `${entry.method} ${entry.path}`)

describe('paying online', () => {
  it('advertises online payment when credentials are configured', async () => {
    expect((await request(appWithPayPal()).get('/api/config')).body.onlinePayments).toBe(true)
    expect((await request(buildApp()).get('/api/config')).body.onlinePayments).toBe(false)
  })

  it('creates a PayPal order for the quoted amount and returns the approval link', async () => {
    const app = appWithPayPal()
    const { response, choice } = await bookRide(app, { booking: { paymentMethod: 'online', locale: 'es' } })

    expect(response.status).toBe(201)
    expect(response.body.payment.approveUrl).toBe('https://www.sandbox.paypal.com/checkoutnow?token=ORDER1ABC')
    expect(response.body.booking).toMatchObject({ paymentMethod: 'online', paymentStatus: 'unpaid', status: 'pending' })

    const reference: string = response.body.booking.reference
    const create = paypal.requests.find((entry) => entry.path === '/v2/checkout/orders')!
    expect(create.headers['paypal-request-id']).toBe(`order-${reference}`)
    expect(JSON.parse(create.body)).toEqual({
      intent: 'CAPTURE',
      purchase_units: [
        {
          reference_id: reference,
          custom_id: reference,
          description: expect.stringContaining(reference),
          amount: { currency_code: 'EUR', value: (choice.totalCents / 100).toFixed(2) },
        },
      ],
      payment_source: {
        paypal: {
          experience_context: {
            return_url: `https://chauffeurs.example/es/booking/payment?ref=${reference}`,
            cancel_url: `https://chauffeurs.example/es/booking/payment?ref=${reference}&cancelled=1`,
            user_action: 'PAY_NOW',
            shipping_preference: 'NO_SHIPPING',
            locale: 'es-ES',
          },
        },
      },
    })

    const [stored] = await db.select().from(bookings)
    expect(stored?.paymentRef).toBe('ORDER1ABC')
  })

  it('captures the payment on return and marks the booking paid, exactly once', async () => {
    const app = appWithPayPal()
    const { response } = await bookRide(app, { booking: { paymentMethod: 'online' } })

    const captured = await request(app).post('/api/payments/paypal/capture').send({ orderId: 'ORDER1ABC' })
    expect(captured.status).toBe(200)
    expect(captured.body.booking).toMatchObject({ reference: response.body.booking.reference, paymentStatus: 'paid' })

    // Reloading the return page must not capture again.
    const again = await request(app).post('/api/payments/paypal/capture').send({ orderId: 'ORDER1ABC' })
    expect(again.status).toBe(200)
    expect(again.body.booking.paymentStatus).toBe('paid')
    expect(pathsCalled().filter((path) => path.endsWith('/capture'))).toHaveLength(1)

    const [stored] = await db.select().from(bookings)
    expect(stored?.paidAt).toBeInstanceOf(Date)
  })

  it('reuses the access token between calls', async () => {
    const app = appWithPayPal()
    await bookRide(app, { booking: { paymentMethod: 'online' } })
    await request(app).post('/api/payments/paypal/capture').send({ orderId: 'ORDER1ABC' })
    expect(pathsCalled().filter((path) => path === 'POST /v1/oauth2/token')).toHaveLength(1)
  })

  it('does not mark a booking paid when the capture is not completed', async () => {
    const app = appWithPayPal()
    await bookRide(app, { booking: { paymentMethod: 'online' } })
    paypal.captureStatus = 'PENDING'

    const response = await request(app).post('/api/payments/paypal/capture').send({ orderId: 'ORDER1ABC' })
    expect(response.status).toBe(502)
    expect(response.body.error.code).toBe('PAYMENT_NOT_COMPLETED')
    expect((await db.select().from(bookings))[0]?.paymentStatus).toBe('unpaid')
  })

  it('does not mark a booking paid when the captured amount differs from the price', async () => {
    const app = appWithPayPal()
    await bookRide(app, { booking: { paymentMethod: 'online' } })
    paypal.captureAmount = '1.00'

    const response = await request(app).post('/api/payments/paypal/capture').send({ orderId: 'ORDER1ABC' })
    expect(response.status).toBe(502)
    expect((await db.select().from(bookings))[0]?.paymentStatus).toBe('unpaid')
  })

  it('rejects an order id that belongs to no booking', async () => {
    const response = await request(appWithPayPal()).post('/api/payments/paypal/capture').send({ orderId: 'UNKNOWN123' })
    expect(response.status).toBe(404)
    expect(pathsCalled()).toEqual([])
  })

  it('stores nothing when PayPal refuses to create the order', async () => {
    paypal.failCreate = true
    const { response } = await bookRide(appWithPayPal(), { booking: { paymentMethod: 'online' } })

    expect(response.status).toBe(502)
    expect(response.body.error.code).toBe('PAYMENT_PROVIDER_ERROR')
    expect(await db.select().from(bookings)).toHaveLength(0)
  })

  it('reports wrong credentials as a provider error', async () => {
    const app = buildApp({ PAYPAL_CLIENT_ID: 'test-client', PAYPAL_CLIENT_SECRET: 'wrong', PAYPAL_API_BASE: paypal.url })
    const { response } = await bookRide(app, { booking: { paymentMethod: 'online' } })
    expect(response.status).toBe(502)
    expect(await db.select().from(bookings)).toHaveLength(0)
  })

  it('still lets the customer pay the chauffeur when online payment is on', async () => {
    const { response } = await bookRide(appWithPayPal(), { booking: { contact: CONTACT } })
    expect(response.status).toBe(201)
    expect(response.body.payment).toBeNull()
    expect(pathsCalled()).toEqual([])
  })

  it('refuses to capture when online payment is not configured', async () => {
    const response = await request(buildApp()).post('/api/payments/paypal/capture').send({ orderId: 'ORDER1ABC' })
    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe('PAYMENTS_UNAVAILABLE')
  })
})
