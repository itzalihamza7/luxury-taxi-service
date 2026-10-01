/**
 * Business details shown across the site.
 *
 * PLACEHOLDERS: the brand name, phone number, email address and legal details
 * below are examples. Replace them with the real business details before launch.
 */
export const site = {
  name: 'Alteza',
  /** Shown next to the name in the logo and page titles. */
  descriptor: 'Chauffeurs',
  city: 'Madrid',
  country: 'Spain',

  phone: '+34 900 000 000',
  /** Digits only, with country code: used for the WhatsApp link. */
  whatsapp: '34900000000',
  email: 'hello@alteza.example',

  /** Leave a link empty to hide its icon. */
  social: {
    instagram: '',
    tripadvisor: '',
  },

  /** Used in the legal pages. Square brackets mark details still to be filled in. */
  legal: {
    companyName: '[Company legal name]',
    taxId: '[NIF]',
    address: '[Registered address]',
    registry: '[Commercial registry details]',
    licence: '[VTC licence number]',
  },

  /**
   * The reviews in `content/testimonials.ts` are sample text for layout only.
   * While this is true, the section is labelled as showing sample reviews.
   * Set it to false once they have been replaced with real, verifiable reviews.
   */
  testimonialsAreSamples: true,
} as const

export const phoneHref = `tel:${site.phone.replace(/[^\d+]/g, '')}`
export const emailHref = `mailto:${site.email}`

export function whatsappHref(message?: string): string {
  const base = `https://wa.me/${site.whatsapp}`
  return message ? `${base}?text=${encodeURIComponent(message)}` : base
}

/** Public URL of the site, without a trailing slash. Read at build time for canonical links. */
export const siteUrl = (process.env.SITE_URL ?? 'http://localhost:3000').replace(/\/+$/, '')
