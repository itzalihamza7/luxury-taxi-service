import type { Localized } from '@/i18n/config'

export interface Testimonial {
  quote: Localized
  /** Who said it. For real reviews use the reviewer's name, with their permission. */
  author: Localized
  context: Localized
}

/**
 * SAMPLE CONTENT - these are placeholders written to show the layout, not real
 * customer reviews. Replace them with genuine, verifiable reviews and then set
 * `testimonialsAreSamples` to false in `content/site.ts`. Until then the site
 * labels this section as showing sample reviews.
 */
export const testimonials: Testimonial[] = [
  {
    quote: {
      en: 'Landed forty minutes late after eleven hours in the air. The chauffeur was at arrivals with my name, took the bags and had me at the hotel before I had finished my messages.',
      es: 'Aterricé con cuarenta minutos de retraso tras once horas de vuelo. El chófer estaba en llegadas con mi nombre, se ocupó de las maletas y me dejó en el hotel antes de que terminara de contestar mis mensajes.',
    },
    author: { en: 'Business traveller', es: 'Viajera de negocios' },
    context: { en: 'Airport transfer · S-Class', es: 'Traslado al aeropuerto · Clase S' },
  },
  {
    quote: {
      en: 'Seven of us, a pushchair and far too much luggage in one van, at a price we knew in advance. Toledo and back with a stop at the viewpoint. Exactly the day we wanted.',
      es: 'Siete personas, un carrito y demasiado equipaje en un solo monovolumen, con un precio que conocíamos de antemano. Toledo ida y vuelta con parada en el mirador. Justo el día que queríamos.',
    },
    author: { en: 'Family of seven', es: 'Familia de siete' },
    context: { en: 'Day trip · V-Class', es: 'Excursión de un día · Clase V' },
  },
  {
    quote: {
      en: 'Four meetings across Madrid in one afternoon. Same car, same driver, waiting outside every time. I did not look at a taxi app once.',
      es: 'Cuatro reuniones por Madrid en una sola tarde. El mismo coche y el mismo conductor, esperando a la salida cada vez. No abrí ni una vez una aplicación de taxis.',
    },
    author: { en: 'Company director', es: 'Director de empresa' },
    context: { en: 'Hourly hire · E-Class', es: 'Servicio por horas · Clase E' },
  },
]
