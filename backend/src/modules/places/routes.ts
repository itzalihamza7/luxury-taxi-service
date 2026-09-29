import { Router } from 'express'
import { z } from 'zod'
import type { AppContext } from '../../context.js'
import { locale, parse } from '../../lib/validate.js'
import { createAddressSearch, popularPlaces, searchCatalog, type Place } from './search.js'

const querySchema = z.object({
  q: z.string().max(120).default(''),
  locale,
})

export function placesRouter({ config, rateLimit }: AppContext): Router {
  const router = Router()
  const searchAddresses = createAddressSearch(config.GEOCODER_URL)

  /**
   * Location suggestions. With no query it returns the quick picks; otherwise
   * hand-picked places first, followed by street addresses.
   */
  router.get('/', rateLimit({ name: 'places', windowMs: 60_000, limit: 90 }), async (req, res) => {
    const { q, locale: lang } = parse(querySchema, req.query)
    const query = q.trim()

    if (!query) {
      res.json({ places: popularPlaces(lang) })
      return
    }

    const curated = searchCatalog(query, lang)
    const addresses = await searchAddresses(query)

    const places: Place[] = [...curated]
    for (const address of addresses) {
      if (places.length >= 8) break
      // Skip an address that is just the curated place again (e.g. "Toledo").
      const duplicate = curated.some((place) => place.label.toLowerCase() === address.label.toLowerCase())
      if (!duplicate) places.push(address)
    }
    res.json({ places })
  })

  return router
}
