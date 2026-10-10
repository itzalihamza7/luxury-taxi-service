/**
 * The brand, as built into the site: logo, page titles and search results.
 *
 * Contact details, company data and all page content are edited in the
 * admin panel (`/admin`), not here.
 *
 * The images that carry the name are `src/app/icon.svg`, `favicon.ico`,
 * `apple-icon.png` and `public/og.jpg`.
 */
export const site = {
  name: 'SignatureMile',
  /** The small line under the name in the logo. */
  descriptor: 'Private chauffeurs',
  city: 'Madrid',
  country: 'Spain',
} as const

/** Public URL of the site, without a trailing slash. Read at build time for canonical links. */
export const siteUrl = (process.env.SITE_URL ?? 'http://localhost:3000').replace(/\/+$/, '')
