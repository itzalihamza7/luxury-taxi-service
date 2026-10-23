import { afterEach, describe, expect, it, vi } from 'vitest'
import { loadConfig } from '../config.js'
import { createMailer, MailError, parseSender } from '../lib/mailer.js'

const graphConfig = {
  ...loadConfig(),
  MAIL_TRANSPORT: 'graph' as const,
  MAIL_FROM: 'SignatureMile <booking@signaturemile.com>',
  GRAPH_TENANT_ID: 'tenant-1',
  GRAPH_CLIENT_ID: 'client-1',
  GRAPH_CLIENT_SECRET: 'secret-1',
}
const email = { to: 'customer@example.com', subject: 'Hello', text: 'Hello', html: '<p>Hello</p>' }

afterEach(() => vi.unstubAllGlobals())

describe('mailer', () => {
  it('reads the sender name and address', () => {
    expect(parseSender('SignatureMile <booking@signaturemile.com>')).toEqual({ name: 'SignatureMile', address: 'booking@signaturemile.com' })
    expect(parseSender('booking@signaturemile.com')).toEqual({ name: '', address: 'booking@signaturemile.com' })
  })

  it('sends through Microsoft Graph as the sender mailbox, reusing the access token', async () => {
    const calls: { url: string; init: RequestInit }[] = []
    vi.stubGlobal('fetch', async (url: string, init: RequestInit) => {
      calls.push({ url, init })
      if (url.includes('/oauth2/v2.0/token')) return Response.json({ access_token: 'token-abc', expires_in: 3600 })
      return new Response(null, { status: 202 })
    })
    const mailer = createMailer(graphConfig)
    await mailer.send(email)
    await mailer.send(email)

    expect(calls.map((call) => call.url)).toEqual([
      'https://login.microsoftonline.com/tenant-1/oauth2/v2.0/token',
      'https://graph.microsoft.com/v1.0/users/booking%40signaturemile.com/sendMail',
      'https://graph.microsoft.com/v1.0/users/booking%40signaturemile.com/sendMail',
    ])
    const tokenRequest = new URLSearchParams(String(calls[0]!.init.body))
    expect(Object.fromEntries(tokenRequest)).toMatchObject({ grant_type: 'client_credentials', client_id: 'client-1', client_secret: 'secret-1', scope: 'https://graph.microsoft.com/.default' })
    expect((calls[1]!.init.headers as Record<string, string>).Authorization).toBe('Bearer token-abc')
    expect(JSON.parse(String(calls[1]!.init.body))).toEqual({
      message: { subject: 'Hello', body: { contentType: 'HTML', content: '<p>Hello</p>' }, toRecipients: [{ emailAddress: { address: 'customer@example.com' } }] },
      saveToSentItems: true,
    })
  })

  it('reports Microsoft errors clearly', async () => {
    vi.stubGlobal('fetch', async (url: string) =>
      url.includes('/token')
        ? Response.json({ access_token: 'token-abc', expires_in: 3600 })
        : Response.json({ error: { code: 'ErrorAccessDenied', message: 'Access is denied.' } }, { status: 403 }),
    )
    await expect(createMailer(graphConfig).send(email)).rejects.toThrow(new MailError('Microsoft Graph sendMail failed (403): ErrorAccessDenied Access is denied.'))
  })

  it('falls back to logging, rather than failing, with an incomplete Graph configuration', async () => {
    const errors: unknown[] = []
    const spy = vi.spyOn(console, 'error').mockImplementation((...args) => void errors.push(args.join(' ')))
    const calls: string[] = []
    vi.stubGlobal('fetch', async (url: string) => void calls.push(url))
    const mailer = createMailer({ ...graphConfig, GRAPH_CLIENT_SECRET: undefined })
    await mailer.send(email)
    spy.mockRestore()
    expect(String(errors[0])).toMatch(/GRAPH_CLIENT_SECRET.*logged, not sent/)
    expect(calls).toHaveLength(0)
  })
})
