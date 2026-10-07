/** Links for the business's phone number, email address and WhatsApp. */

export const phoneHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, '')}`

export const emailHref = (email: string) => `mailto:${email}`

/** `whatsapp` is the number in digits only, with country code. */
export function whatsappHref(whatsapp: string, message?: string): string {
  const base = `https://wa.me/${whatsapp}`
  return message ? `${base}?text=${encodeURIComponent(message)}` : base
}
