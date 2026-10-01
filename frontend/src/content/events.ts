import type { Localized } from '@/i18n/config'

export interface EventGuide {
  slug: string
  kind: 'fair' | 'art' | 'sport'
  title: Localized
  venue: string
  /** Place id used to prefill the booking form's drop-off. */
  placeId: string
  /** Dates as announced by the organiser (`YYYY-MM-DD`). Update each year. */
  start: string
  end: string
  summary: Localized
  /** Page heading; `*word*` marks the italic accent. */
  heading: Localized
  body: Localized<string[]>
  tips: Localized<string[]>
}

/**
 * Major dates in Madrid's calendar when demand for cars is highest.
 * We are not affiliated with the organisers; event names belong to their owners.
 * Dates were checked against the organisers' websites in October 2026 - verify
 * them again when you update this list.
 */
export const events: EventGuide[] = [
  {
    slug: 'fitur-madrid',
    kind: 'fair',
    title: { en: 'FITUR', es: 'FITUR' },
    venue: 'IFEMA Madrid',
    placeId: 'cat:ifema',
    start: '2027-01-20',
    end: '2027-01-24',
    summary: {
      en: 'The international tourism trade fair fills IFEMA — and every taxi rank near it — for five days in January.',
      es: 'La feria internacional de turismo llena IFEMA, y todas las paradas de taxi de alrededor, durante cinco días de enero.',
    },
    heading: { en: 'FITUR week, *without the taxi queue*', es: 'La semana de FITUR, *sin colas de taxi*' },
    body: {
      en: [
        'FITUR is one of the largest travel-industry fairs in the world. For five days the halls at IFEMA are full from opening to close, hotels across the north-east of the city sell out, and at six in the evening thousands of people leave at once.',
        'A car booked in advance changes the shape of the day. Your chauffeur drops you at the entrance nearest your hall and is waiting at an agreed point when you come out, so you are on your way to dinner while the queue is still forming.',
        'For exhibitors and teams, hourly hire keeps one vehicle on call for the whole day: airport collections in the morning, the fair, client dinners in the evening. A van carries a stand team and its samples in one trip.',
      ],
      es: [
        'FITUR es una de las mayores ferias del sector turístico del mundo. Durante cinco días los pabellones de IFEMA están llenos de la apertura al cierre, los hoteles del nordeste de la ciudad se agotan y, a las seis de la tarde, miles de personas salen a la vez.',
        'Un coche reservado con antelación cambia el día por completo. Su chófer le deja en el acceso más cercano a su pabellón y le espera en un punto acordado a la salida, de modo que ya va camino de la cena mientras la cola todavía se está formando.',
        'Para expositores y equipos, el servicio por horas mantiene un vehículo disponible toda la jornada: recogidas en el aeropuerto por la mañana, la feria y cenas con clientes por la noche. Un monovolumen lleva a todo el equipo del stand y sus muestras en un solo viaje.',
      ],
    },
    tips: {
      en: [
        'Wednesday to Friday are trade days; the weekend is open to the public',
        'Book evening pickups early — the hour after closing is the busiest of the week',
        'IFEMA is minutes from the airport: we can meet arriving colleagues and bring them straight to the fair',
        'Tell us your hall number so we use the right entrance',
      ],
      es: [
        'De miércoles a viernes son jornadas profesionales; el fin de semana abre al público',
        'Reserve pronto las recogidas de la tarde: la hora posterior al cierre es la de más demanda de la semana',
        'IFEMA está a pocos minutos del aeropuerto: podemos recoger a sus compañeros y llevarlos directamente a la feria',
        'Indíquenos su número de pabellón para usar el acceso adecuado',
      ],
    },
  },
  {
    slug: 'arco-madrid',
    kind: 'art',
    title: { en: 'ARCOmadrid', es: 'ARCOmadrid' },
    venue: 'IFEMA Madrid',
    placeId: 'cat:ifema',
    start: '2027-03-03',
    end: '2027-03-07',
    summary: {
      en: 'Spain’s contemporary art fair, plus a week of gallery openings and dinners across the city.',
      es: 'La feria de arte contemporáneo de España, junto a una semana de inauguraciones y cenas por toda la ciudad.',
    },
    heading: { en: 'Art week in Madrid, *gallery to gallery*', es: 'La semana del arte en Madrid, *de galería en galería*' },
    body: {
      en: [
        'ARCOmadrid brings collectors, galleries and curators to IFEMA each spring, and the fair is only half of it. The same week the city’s galleries, museums and foundations hold openings every evening, spread from Salesas to Carabanchel.',
        'That makes it a week of many short journeys at awkward hours. Hourly hire suits it well: one car and one chauffeur for the evening, waiting outside each opening, with no time lost finding a taxi between them.',
        'We are used to discreet, punctual work for collectors and gallery guests, and to the practical side too — a van for a team, or a flagship car for a guest you want looked after.',
      ],
      es: [
        'ARCOmadrid reúne cada primavera a coleccionistas, galerías y comisarios en IFEMA, y la feria es solo la mitad. Esa misma semana las galerías, museos y fundaciones de la ciudad inauguran cada tarde, repartidos desde Salesas hasta Carabanchel.',
        'Eso la convierte en una semana de muchos trayectos cortos a horas incómodas. El servicio por horas encaja muy bien: un coche y un chófer para toda la tarde, esperando a la salida de cada inauguración, sin perder tiempo buscando taxi entre una y otra.',
        'Estamos acostumbrados a trabajar con discreción y puntualidad para coleccionistas e invitados de galerías, y también a lo práctico: un monovolumen para un equipo o un coche de gama insignia para un invitado al que quiere cuidar.',
      ],
    },
    tips: {
      en: [
        'The first days are for professionals; public days follow at the weekend',
        'For an evening of openings, book by the hour rather than several single rides',
        'Give us the list of addresses and we will plan the order to save time',
        'Dates and hours can change: check the fair’s website before you travel',
      ],
      es: [
        'Los primeros días son para profesionales; las jornadas de público llegan el fin de semana',
        'Para una tarde de inauguraciones, reserve por horas en lugar de varios trayectos sueltos',
        'Envíenos la lista de direcciones y planificaremos el orden para ahorrar tiempo',
        'Las fechas y horarios pueden cambiar: consulte la web de la feria antes de viajar',
      ],
    },
  },
  {
    slug: 'mutua-madrid-open',
    kind: 'sport',
    title: { en: 'Mutua Madrid Open', es: 'Mutua Madrid Open' },
    venue: 'Caja Mágica',
    placeId: 'cat:caja-magica',
    start: '2027-04-19',
    end: '2027-05-02',
    summary: {
      en: 'Two weeks of top-level tennis at the Caja Mágica, in a part of Madrid that is easy to reach and slow to leave.',
      es: 'Dos semanas de tenis de primer nivel en la Caja Mágica, en una zona de Madrid a la que se llega fácil y de la que se sale despacio.',
    },
    heading: { en: 'The Madrid Open, *home before midnight*', es: 'El Madrid Open, *en casa antes de medianoche*' },
    body: {
      en: [
        'The Caja Mágica sits in the south of the city, beside the Manzanares park and away from the hotel districts. Getting there in the afternoon is simple. Getting back after a night session, when thousands of spectators leave together, is not.',
        'A pre-booked car solves the difficult half of the evening. We agree a pickup point a short walk from the gates, your chauffeur is in place before the last point, and you leave as the match ends rather than an hour later.',
        'Because sessions rarely finish on schedule, a return with a flexible pickup or a few hours of hourly hire works better than a fixed time. Tell us which session you have tickets for and we will plan around it.',
      ],
      es: [
        'La Caja Mágica está en el sur de la ciudad, junto al parque del Manzanares y lejos de las zonas de hoteles. Llegar por la tarde es sencillo. Volver después de una sesión nocturna, cuando miles de espectadores salen a la vez, no lo es.',
        'Un coche reservado con antelación resuelve la parte difícil de la noche. Acordamos un punto de recogida a pocos pasos de los accesos, su chófer está en su sitio antes del último punto y usted sale cuando acaba el partido, no una hora después.',
        'Como las sesiones rara vez terminan a su hora, funciona mejor una vuelta con recogida flexible o unas horas de servicio por horas que una hora fija. Díganos para qué sesión tiene entradas y lo planificaremos en función de ella.',
      ],
    },
    tips: {
      en: [
        'Night sessions can run past midnight: plan the return before you go',
        'Finals weekend books up first',
        'Groups of four or more travel together in a van for one fixed price',
        'Dates can shift slightly: check the tournament’s website when you buy tickets',
      ],
      es: [
        'Las sesiones nocturnas pueden terminar pasada la medianoche: planifique la vuelta antes de ir',
        'El fin de semana de las finales es lo primero que se llena',
        'Los grupos de cuatro o más viajan juntos en un monovolumen por un precio cerrado',
        'Las fechas pueden variar ligeramente: consulte la web del torneo al comprar las entradas',
      ],
    },
  },
]

export const eventBySlug = (slug: string) => events.find((event) => event.slug === slug)
