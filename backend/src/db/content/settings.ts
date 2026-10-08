import type { SiteSettings } from '../../modules/content/schemas.js'

/**
 * Business details a new database starts with.
 *
 * PLACEHOLDERS: the phone number, email address and company details are
 * examples. Replace them in the console ("Business details") before launch.
 */
export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  phone: '+34 900 000 000',
  whatsapp: '34900000000',
  email: 'hello@viacentralmobility.example',
  social: { instagram: '', facebook: '', tripadvisor: '', google: '' },
  legal: {
    companyName: '[Company legal name]',
    taxId: '[NIF]',
    address: '[Registered address]',
    registry: '[Commercial registry details]',
    licence: '[VTC licence number]',
  },
  reviewsAreSamples: true,
  linkBookingsOnSignup: true,
}
