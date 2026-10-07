/**
 * The brand, as built into the site: logo, page titles and search results.
 *
 * Contact details, company data and all page content are edited in the
 * operations console (`/admin`), not here.
 *
 * PLACEHOLDER: the brand name is an example. If it changes, also replace the
 * images that carry it (see "Before going live" in the README).
 */
export const site = {
  name: 'Alteza',
  /** Shown next to the name in the logo and page titles. */
  descriptor: 'Chauffeurs',
  city: 'Madrid',
  country: 'Spain',
} as const

/** Public URL of the site, without a trailing slash. Read at build time for canonical links. */
export const siteUrl = (process.env.SITE_URL ?? 'http://localhost:3000').replace(/\/+$/, '')
