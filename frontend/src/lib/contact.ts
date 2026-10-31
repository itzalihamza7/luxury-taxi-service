/** Links for the business's phone number, email address and WhatsApp. */

export const phoneHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, '')}`

export const emailHref = (email: string) => `mailto:${email}`

/** Whether the API will take this as a phone number of any country: the same rule as `phone` in the backend's validate.ts. */
export function isPhone(value: string): boolean {
  const visible = value.normalize('NFKC').replace(/\p{Cf}/gu, '')
  const international = /^\s*(\+|00)/.test(visible)
  const phone = (international ? visible.replace(/\(\s*0\s*\)/, ' ') : visible)
    .replace(/[/\\‐-―−]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  const digits = phone.replace(/\D/g, '').replace(/^00/, '').length
  return phone.length <= 30 && /^\+?[\d\s().-]+$/.test(phone) && digits >= 7 && digits <= 15
}

/** `whatsapp` is the number in digits only, with country code. */
export function whatsappHref(whatsapp: string, message?: string): string {
  const base = `https://wa.me/${whatsapp}`
  return message ? `${base}?text=${encodeURIComponent(message)}` : base
}
