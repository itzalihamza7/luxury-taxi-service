import { connection } from 'next/server'
import { site, siteUrl } from '@/content/site'
import { href, type Locale } from '@/i18n/config'
import { formatMoney } from '@/lib/format'
import { loadCollection, loadSettings, loadVehicles, quietly } from '@/lib/server-api'

/**
 * `/llms.txt`: a plain summary of the business for AI assistants (ChatGPT, Claude,
 * Perplexity...), with links to the pages that answer the usual questions. Built from
 * the live content, like the sitemap, so it never drifts from the site.
 */
export async function GET() {
  await connection()
  const [vehicles, services, routes, articles, faqs, settings] = await Promise.all([
    quietly('the fleet', () => loadVehicles(), []),
    quietly('the services', () => loadCollection('service'), []),
    quietly('the routes', () => loadCollection('route'), []),
    quietly('the articles', () => loadCollection('article'), []),
    quietly('the FAQs', () => loadCollection('faq'), []),
    quietly('the business details', () => loadSettings(), null),
  ])

  const en: Locale = 'en'
  const url = (path: string, locale: Locale = en) => `${siteUrl}${href(locale, path)}`
  const oneLine = (text: string) => text.replace(/\s+/g, ' ').trim()
  const duration = (minutes: number) => (minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)} h${minutes % 60 ? ` ${minutes % 60} min` : ''}`)

  const lines = [
    `# ${site.name}`,
    '',
    `> ${site.name} is a private chauffeur service based in ${site.city}, ${site.country}: airport transfers at Madrid–Barajas (MAD), hourly chauffeur hire, Madrid city rides, city-to-city transfers and day trips. Every vehicle's fixed price, VAT included, is shown before booking, online or by phone and WhatsApp, 24 hours a day.`,
    '',
    '- Chauffeurs speak English and Spanish; meet & greet with a name board and flight tracking on airport pickups.',
    '- Works across Madrid and its region every day, with long-distance transfers to anywhere in mainland Spain.',
    '- Free cancellation up to 24 hours before pickup. Booking as a guest needs no account.',
    ...(settings ? [`- Contact: phone ${settings.phone}, WhatsApp +${settings.whatsapp}, email ${settings.email}.`] : []),
    `- Book: ${url('/booking')}`,
    '',
  ]

  if (services.length > 0) {
    lines.push('## Services', '')
    for (const service of services) lines.push(`- [${service.title.en}](${url(`/services/${service.slug}`)}): ${oneLine(service.summary.en)}`)
    lines.push('')
  }

  if (vehicles.length > 0) {
    lines.push('## Fleet', '')
    for (const vehicle of vehicles) {
      const from = vehicle.fromCents > 0 ? `, from ${formatMoney(vehicle.fromCents, 'EUR', en)} fixed for a ride within the M-30 ring or between the airport and the M-30` : ''
      lines.push(`- [${vehicle.name}](${url(`/fleet/${vehicle.slug}`)}): ${oneLine(vehicle.tagline.en)}, up to ${vehicle.passengers} passengers and ${vehicle.luggage} large suitcases${from}.`)
    }
    lines.push('')
  }

  if (routes.length > 0) {
    lines.push('## Day trips and transfers from Madrid', '')
    for (const route of routes) lines.push(`- [${route.city.en}](${url(`/routes/${route.slug}`)}): ${route.km} km, about ${duration(route.minutes)} by road (${route.road}). ${oneLine(route.summary.en)}`)
    lines.push('')
  }

  if (articles.length > 0) {
    lines.push('## Guides', '')
    for (const article of articles) lines.push(`- [${article.title.en}](${url(`/journal/${article.slug}`)}): ${oneLine(article.excerpt.en)}`)
    lines.push('')
  }

  if (faqs.length > 0) {
    lines.push('## Frequently asked questions', '', `Full answers: ${url('/faq')}`, '')
    for (const faq of faqs) lines.push(`- **${oneLine(faq.question.en)}** ${oneLine(faq.answer.en)}`)
    lines.push('')
  }

  lines.push(
    '## In Spanish',
    '',
    `- [Servicio de chófer privado en Madrid](${url('/', 'es')})`,
    `- [Servicios](${url('/services', 'es')}), [flota](${url('/fleet', 'es')}), [rutas](${url('/routes', 'es')}), [preguntas frecuentes](${url('/faq', 'es')})`,
    '',
  )

  return new Response(lines.join('\n'), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=3600' },
  })
}
