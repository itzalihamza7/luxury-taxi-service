import type { SiteSettings } from '../../modules/content/schemas.js'

/**
 * Business details a new database starts with.
 *
 * PLACEHOLDERS: the phone number is an example. Replace it in the console
 * ("Business details") before launch. The company details start empty and
 * hidden; the legal pages show them once they are filled in and shown.
 */
export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  phone: '+34 900 000 000',
  whatsapp: '34900000000',
  email: 'booking@signaturemile.com',
  social: { instagram: '', facebook: '', tripadvisor: '', google: '' },
  legal: { hidden: true, companyName: '', taxId: '', address: '', registry: '', licence: '' },
  reviewsAreSamples: true,
  linkBookingsOnSignup: true,
}
