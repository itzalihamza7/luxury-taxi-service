import { and, eq, gt } from 'drizzle-orm'
import request from 'supertest'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../db/client.js'
import { passwordResets, sessions, users } from '../db/schema.js'
import type { Email } from '../lib/mailer.js'
import { buildApp, memoryMailer, registerAgent, resetDatabase } from './helpers.js'

beforeEach(resetDatabase)

/** The reset email is sent in the background: wait for it. */
async function nextEmail(sent: Email[], count = 1) {
  for (let i = 0; i < 100 && sent.length < count; i += 1) await new Promise((resolve) => setTimeout(resolve, 20))
  return sent[count - 1]
}
const linkToken = (text: string) => text.match(/reset-password\?token=([\w-]+)/)?.[1] ?? ''
const settle = () => new Promise((resolve) => setTimeout(resolve, 300))

describe('forgot password', () => {
  it('emails a one-time link that sets a new password, signs out every device and confirms by email', async () => {
    const { sent, mailer } = memoryMailer()
    const app = buildApp({ APP_URL: 'https://signaturemile.example' }, { mailer })
    const oldDevice = await registerAgent(app, 'client@example.com', 'old-password-1')

    const asked = await request(app).post('/api/auth/forgot').send({ email: 'Client@Example.com', locale: 'es' })
    expect(asked.body).toEqual({ ok: true })
    const email = (await nextEmail(sent))!
    expect(email).toMatchObject({ to: 'client@example.com', subject: 'Restablezca su contraseña de SignatureMile' })
    expect(email.text).toContain('https://signaturemile.example/es/reset-password?token=')
    expect(email.html).toContain('Elegir una nueva contraseña')
    const token = linkToken(email.text)
    // Only a hash of the token is stored.
    const [stored] = await db.select().from(passwordResets)
    expect(stored?.tokenHash).not.toBe(token)

    const browser = request.agent(app)
    const reset = await browser.post('/api/auth/reset').send({ token, password: 'new-password-1', locale: 'es' })
    expect(reset.status).toBe(200)
    expect(reset.body.user.email).toBe('client@example.com')
    // The browser that reset the password is signed in; the old device is not.
    expect((await browser.get('/api/auth/me')).body.user.email).toBe('client@example.com')
    expect((await oldDevice.get('/api/auth/me')).body.user).toBeNull()

    expect((await request(app).post('/api/auth/login').send({ email: 'client@example.com', password: 'old-password-1' })).status).toBe(401)
    expect((await request(app).post('/api/auth/login').send({ email: 'client@example.com', password: 'new-password-1' })).status).toBe(200)

    expect((await nextEmail(sent, 2))?.subject).toBe('Se ha cambiado su contraseña de SignatureMile')
    // The link worked once.
    const again = await request(app).post('/api/auth/reset').send({ token, password: 'another-password-1' })
    expect(again.body.error.code).toBe('RESET_LINK_INVALID')
  })

  it('answers the same for unknown emails and sends nothing', async () => {
    const { sent, mailer } = memoryMailer()
    const app = buildApp({}, { mailer })
    const response = await request(app).post('/api/auth/forgot').send({ email: 'nobody@example.com' })
    expect(response.status).toBe(200)
    expect(response.body).toEqual({ ok: true })
    await settle()
    expect(sent).toHaveLength(0)
  })

  it('refuses expired, unknown and weak resets', async () => {
    const { sent, mailer } = memoryMailer()
    const app = buildApp({}, { mailer })
    await registerAgent(app, 'client@example.com')
    await request(app).post('/api/auth/forgot').send({ email: 'client@example.com' })
    const token = linkToken((await nextEmail(sent))!.text)

    expect((await request(app).post('/api/auth/reset').send({ token, password: 'short' })).body.error.fields).toEqual({ password: 'too_short' })
    expect((await request(app).post('/api/auth/reset').send({ token: 'x'.repeat(43), password: 'new-password-1' })).body.error.code).toBe('RESET_LINK_INVALID')

    await db.update(passwordResets).set({ expiresAt: new Date(Date.now() - 1000) })
    expect((await request(app).post('/api/auth/reset').send({ token, password: 'new-password-1' })).body.error.code).toBe('RESET_LINK_INVALID')
  })

  it('keeps only the newest link and sends at most 3 an hour per account', async () => {
    const { sent, mailer } = memoryMailer()
    const app = buildApp({}, { mailer })
    await registerAgent(app, 'client@example.com')
    const user = (await db.select().from(users).where(eq(users.email, 'client@example.com')))[0]!

    for (let i = 1; i <= 4; i += 1) {
      await request(app).post('/api/auth/forgot').send({ email: 'client@example.com' })
      await settle()
    }
    expect(sent).toHaveLength(3)
    const first = linkToken(sent[0]!.text)
    expect((await request(app).post('/api/auth/reset').send({ token: first, password: 'new-password-1' })).body.error.code).toBe('RESET_LINK_INVALID')
    const working = await db.select().from(passwordResets).where(and(eq(passwordResets.userId, user.id), gt(passwordResets.expiresAt, new Date())))
    expect(working).toHaveLength(1)
    expect((await request(app).post('/api/auth/reset').send({ token: linkToken(sent[2]!.text), password: 'new-password-1' })).status).toBe(200)
    expect(await db.select().from(sessions).where(eq(sessions.userId, user.id))).toHaveLength(1)
  })
})
