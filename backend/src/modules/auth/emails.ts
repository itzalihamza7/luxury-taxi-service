import { layout } from '../../lib/email-layout.js'
import type { Email } from '../../lib/mailer.js'

type Locale = 'en' | 'es'

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
    html: layout(paragraphs, { button: { label: c.resetButton, url } }),
  }
}

export function passwordChangedEmail(to: string, name: string, locale: Locale): Email {
  const c = copy[locale]
  const paragraphs = c.changedText(name)
  return { to, subject: c.changedSubject, text: `${paragraphs.join('\n\n')}\n`, html: layout(paragraphs) }
}
