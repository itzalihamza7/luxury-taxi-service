import nodemailer from 'nodemailer'
import type { Config } from '../config.js'

export interface Email {
  to: string
  subject: string
  text: string
  html: string
}

export interface Mailer {
  send(email: Email): Promise<void>
}

export class MailError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'MailError'
  }
}

/** `Name <address@example.com>` -> `{ name, address }`. */
export function parseSender(from: string): { name: string; address: string } {
  const match = from.match(/^\s*(.*?)\s*<([^>]+)>\s*$/)
  return match ? { name: match[1]!.replace(/^"|"$/g, ''), address: match[2]!.trim() } : { name: '', address: from.trim() }
}

/**
 * Microsoft 365 through the Graph API, with an Entra app's client credentials.
 * Microsoft no longer accepts mailbox passwords over SMTP, so this is how a
 * Microsoft 365 mailbox sends on behalf of the site. The message is also kept
 * in the mailbox's Sent Items.
 */
function graphMailer(config: Config): Mailer {
  const { GRAPH_TENANT_ID: tenant, GRAPH_CLIENT_ID: clientId, GRAPH_CLIENT_SECRET: secret } = config
  if (!tenant || !clientId || !secret) throw new Error('MAIL_TRANSPORT=graph needs GRAPH_TENANT_ID, GRAPH_CLIENT_ID and GRAPH_CLIENT_SECRET')
  const sender = parseSender(config.MAIL_FROM)
  let token: { value: string; expiresAt: number } | null = null

  async function accessToken(): Promise<string> {
    if (token && token.expiresAt > Date.now() + 60_000) return token.value
    const response = await fetch(`https://login.microsoftonline.com/${encodeURIComponent(tenant!)}/oauth2/v2.0/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'client_credentials', client_id: clientId!, client_secret: secret!, scope: 'https://graph.microsoft.com/.default' }),
      signal: AbortSignal.timeout(15_000),
    })
    const body = (await response.json().catch(() => ({}))) as { access_token?: string; expires_in?: number; error_description?: string }
    if (!response.ok || !body.access_token) throw new MailError(`Microsoft sign-in failed (${response.status}): ${body.error_description?.split('\n')[0] ?? 'no token'}`)
    token = { value: body.access_token, expiresAt: Date.now() + (body.expires_in ?? 3600) * 1000 }
    return token.value
  }

  return {
    async send(email) {
      const response = await fetch(`https://graph.microsoft.com/v1.0/users/${encodeURIComponent(sender.address)}/sendMail`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${await accessToken()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: {
            subject: email.subject,
            body: { contentType: 'HTML', content: email.html },
            toRecipients: [{ emailAddress: { address: email.to } }],
          },
          saveToSentItems: true,
        }),
        signal: AbortSignal.timeout(15_000),
      })
      if (response.status !== 202) {
        const detail = (await response.json().catch(() => null)) as { error?: { code?: string; message?: string } } | null
        throw new MailError(`Microsoft Graph sendMail failed (${response.status}): ${detail?.error?.code ?? ''} ${detail?.error?.message ?? ''}`.trim())
      }
    },
  }
}

function smtpMailer(config: Config): Mailer {
  if (!config.SMTP_HOST) throw new Error('MAIL_TRANSPORT=smtp needs SMTP_HOST')
  const transport = nodemailer.createTransport({
    host: config.SMTP_HOST,
    port: config.SMTP_PORT,
    secure: config.SMTP_SECURE,
    auth: config.SMTP_USER ? { user: config.SMTP_USER, pass: config.SMTP_PASSWORD ?? '' } : undefined,
  })
  return {
    async send(email) {
      try {
        await transport.sendMail({ from: config.MAIL_FROM, ...email })
      } catch (error) {
        throw new MailError(`SMTP send failed: ${error instanceof Error ? error.message : String(error)}`)
      }
    },
  }
}

/**
 * Writes emails to the log instead of sending them. The body (which can hold a
 * reset link) is only printed in development.
 */
function logMailer(config: Config): Mailer {
  return {
    async send(email) {
      if (config.NODE_ENV === 'test') return
      const body = config.NODE_ENV === 'development' ? `\n${email.text}` : ' (body not logged; set MAIL_TRANSPORT to send emails)'
      console.log(`[mail] to=${email.to} subject="${email.subject}"${body}`)
    },
  }
}

/**
 * A mistake in the mail settings must not take the site down: it is reported,
 * and emails are logged instead of sent until it is fixed.
 */
export function createMailer(config: Config): Mailer {
  try {
    if (config.MAIL_TRANSPORT === 'graph') return graphMailer(config)
    if (config.MAIL_TRANSPORT === 'smtp') return smtpMailer(config)
  } catch (error) {
    console.error(`[mail] ${error instanceof Error ? error.message : String(error)}; emails are logged, not sent`)
  }
  return logMailer(config)
}
