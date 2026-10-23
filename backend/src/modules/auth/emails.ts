import type { Email } from '../../lib/mailer.js'

type Locale = 'en' | 'es'

const escape = (value: string) => value.replace(/[&<>"']/g, (character) => `&#${character.charCodeAt(0)};`)

/** A plain, readable message: the same text as HTML, with one button. */
function layout(paragraphs: string[], button?: { label: string; url: string }): string {
  const body = paragraphs.map((paragraph) => `<p style="margin:0 0 16px;line-height:1.55">${escape(paragraph)}</p>`).join('')
  const action = button
    ? `<p style="margin:24px 0"><a href="${escape(button.url)}" style="display:inline-block;background:#080c13;color:#e3cc9f;text-decoration:none;padding:12px 22px;border-radius:999px;font-weight:600">${escape(button.label)}</a></p><p style="margin:0 0 16px;font-size:13px;color:#555;word-break:break-all">${escape(button.url)}</p>`
    : ''
  return `<!doctype html><html><body style="margin:0;background:#f2eee6;padding:24px;font-family:Arial,Helvetica,sans-serif;color:#0c121b;font-size:15px"><div style="max-width:520px;margin:0 auto;background:#fff;border-radius:10px;padding:28px"><p style="margin:0 0 20px;font-family:Georgia,serif;font-size:20px;letter-spacing:2px">SIGNATUREMILE</p>${body}${action}</div></body></html>`
}

const copy = {
  en: {
    resetSubject: 'Reset your SignatureMile password',
    resetText: (name: string, minutes: number) => [
      `Hello ${name},`,
      'We received a request to reset the password of your SignatureMile account. Use the button below to choose a new one.',
      `The link works once, for ${minutes} minutes. If you did not ask for this, you can ignore this email: your password stays the same.`,
    ],
    resetButton: 'Choose a new password',
    changedSubject: 'Your SignatureMile password was changed',
    changedText: (name: string) => [
      `Hello ${name},`,
      'The password of your SignatureMile account has just been changed, and you were signed out on your other devices.',
      'If this was not you, reply to this email or contact us straight away.',
    ],
  },
  es: {
    resetSubject: 'Restablezca su contraseña de SignatureMile',
    resetText: (name: string, minutes: number) => [
      `Hola ${name}:`,
      'Hemos recibido una solicitud para restablecer la contraseña de su cuenta de SignatureMile. Use el botón para elegir una nueva.',
      `El enlace funciona una sola vez, durante ${minutes} minutos. Si no lo ha pedido usted, ignore este correo: su contraseña no cambia.`,
    ],
    resetButton: 'Elegir una nueva contraseña',
    changedSubject: 'Se ha cambiado su contraseña de SignatureMile',
    changedText: (name: string) => [
      `Hola ${name}:`,
      'Se acaba de cambiar la contraseña de su cuenta de SignatureMile y se ha cerrado su sesión en sus otros dispositivos.',
      'Si no ha sido usted, responda a este correo o contacte con nosotros de inmediato.',
    ],
  },
} as const

export function resetEmail(to: string, name: string, url: string, minutes: number, locale: Locale): Email {
  const c = copy[locale]
  const paragraphs = c.resetText(name, minutes)
  return {
    to,
    subject: c.resetSubject,
    text: `${paragraphs.join('\n\n')}\n\n${url}\n`,
    html: layout(paragraphs, { label: c.resetButton, url }),
  }
}

export function passwordChangedEmail(to: string, name: string, locale: Locale): Email {
  const c = copy[locale]
  const paragraphs = c.changedText(name)
  return { to, subject: c.changedSubject, text: `${paragraphs.join('\n\n')}\n`, html: layout(paragraphs) }
}
