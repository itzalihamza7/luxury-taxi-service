import type { Config } from '../../config.js'

export interface CreateOrderInput {
  reference: string
  amountCents: number
  currency: string
  description: string
  returnUrl: string
  cancelUrl: string
  locale: 'en' | 'es'
}

export interface CaptureResult {
  /** True only when PayPal reports a completed capture. */
  completed: boolean
  amountCents: number | null
  currency: string | null
}

export interface PaymentGateway {
  /** False when no provider credentials are configured; online payment is then not offered. */
  enabled: boolean
  createOrder(input: CreateOrderInput): Promise<{ orderId: string; approveUrl: string }>
  captureOrder(orderId: string): Promise<CaptureResult>
}

export class PaymentError extends Error {}

const disabledGateway: PaymentGateway = {
  enabled: false,
  createOrder: () => Promise.reject(new PaymentError('online payments are not configured')),
  captureOrder: () => Promise.reject(new PaymentError('online payments are not configured')),
}

const toAmount = (cents: number) => (cents / 100).toFixed(2)
const toCents = (value: string) => Math.round(Number(value) * 100)

/**
 * PayPal Checkout (Orders v2) using the redirect flow: we create an order, send
 * the customer to PayPal to approve it, and capture it when they come back.
 * Card details never touch this application.
 */
export function createPayPalGateway(config: Config): PaymentGateway {
  const { PAYPAL_CLIENT_ID: clientId, PAYPAL_CLIENT_SECRET: clientSecret } = config
  if (!clientId || !clientSecret) return disabledGateway

  const baseUrl = config.PAYPAL_API_BASE.replace(/\/+$/, '')
  let cachedToken: { value: string; expiresAt: number } | null = null

  async function accessToken(): Promise<string> {
    if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.value

    const response = await fetch(`${baseUrl}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
      signal: AbortSignal.timeout(10_000),
    })
    if (!response.ok) throw new PaymentError(`PayPal authentication failed (${response.status})`)

    const body = (await response.json()) as { access_token?: string; expires_in?: number }
    if (!body.access_token) throw new PaymentError('PayPal authentication returned no token')
    cachedToken = { value: body.access_token, expiresAt: Date.now() + (body.expires_in ?? 300) * 1000 }
    return cachedToken.value
  }

  async function call(path: string, requestId: string, payload?: unknown): Promise<Record<string, unknown>> {
    const response = await fetch(`${baseUrl}${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${await accessToken()}`,
        'Content-Type': 'application/json',
        // Makes retries safe: PayPal returns the original result for a repeated id.
        'PayPal-Request-Id': requestId,
      },
      body: payload === undefined ? undefined : JSON.stringify(payload),
      signal: AbortSignal.timeout(15_000),
    })
    const body = (await response.json().catch(() => ({}))) as Record<string, unknown>
    if (!response.ok) {
      throw new PaymentError(`PayPal ${path} failed (${response.status}): ${String(body.name ?? body.message ?? 'unknown error')}`)
    }
    return body
  }

  return {
    enabled: true,

    async createOrder(input) {
      const order = await call('/v2/checkout/orders', `order-${input.reference}`, {
        intent: 'CAPTURE',
        purchase_units: [
          {
            reference_id: input.reference,
            custom_id: input.reference,
            description: input.description.slice(0, 127),
            amount: { currency_code: input.currency, value: toAmount(input.amountCents) },
          },
        ],
        payment_source: {
          paypal: {
            experience_context: {
              return_url: input.returnUrl,
              cancel_url: input.cancelUrl,
              user_action: 'PAY_NOW',
              shipping_preference: 'NO_SHIPPING',
              locale: input.locale === 'es' ? 'es-ES' : 'en-GB',
            },
          },
        },
      })

      const links = Array.isArray(order.links) ? (order.links as { rel?: string; href?: string }[]) : []
      const approveUrl = links.find((link) => link.rel === 'payer-action' || link.rel === 'approve')?.href
      if (typeof order.id !== 'string' || !approveUrl) throw new PaymentError('PayPal returned no approval link')
      return { orderId: order.id, approveUrl }
    },

    async captureOrder(orderId) {
      const order = await call(`/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`, `capture-${orderId}`)

      const units = Array.isArray(order.purchase_units) ? (order.purchase_units as Record<string, unknown>[]) : []
      const payments = units[0]?.payments as { captures?: { status?: string; amount?: { currency_code?: string; value?: string } }[] } | undefined
      const capture = payments?.captures?.[0]

      return {
        completed: order.status === 'COMPLETED' && capture?.status === 'COMPLETED',
        amountCents: capture?.amount?.value ? toCents(capture.amount.value) : null,
        currency: capture?.amount?.currency_code ?? null,
      }
    },
  }
}
