import type { Localized } from '@/i18n/config'

export interface ArticleSection {
  heading?: string
  paragraphs: string[]
  list?: string[]
}

export interface Article {
  slug: string
  /** Publication date, `YYYY-MM-DD`. */
  date: string
  minutes: number
  category: Localized
  title: Localized
  excerpt: Localized
  body: Localized<ArticleSection[]>
  /** Where the "book this" button at the end of the article leads. */
  cta: { href: string; label: Localized }
}

export const articles: Article[] = [
  {
    slug: 'arriving-at-madrid-barajas',
    date: '2026-09-22',
    minutes: 4,
    category: { en: 'Airport', es: 'Aeropuerto' },
    title: {
      en: 'Arriving at Madrid–Barajas: where you will actually come out',
      es: 'Llegar a Madrid–Barajas: por dónde va a salir realmente',
    },
    excerpt: {
      en: 'Four terminals, one satellite and two separate complexes. A short guide to where arrivals meet the outside world — and how long it really takes.',
      es: 'Cuatro terminales, un satélite y dos complejos separados. Una guía breve sobre dónde desembocan las llegadas y cuánto se tarda de verdad.',
    },
    body: {
      en: [
        {
          paragraphs: [
            'Madrid’s airport is really two airports that share runways. Knowing which one you land at is the difference between meeting your driver in five minutes and wandering a concourse with a dying phone.',
          ],
        },
        {
          heading: 'Two complexes, several kilometres apart',
          paragraphs: [
            'Terminals 1, 2 and 3 form the older complex, joined to each other on foot. Terminal 4 and its satellite, T4S, form the newer one, a drive away on the other side of the airfield. A free shuttle bus links the two, but it is not a walk.',
            'If someone is meeting you, the terminal matters. Your booking confirmation or boarding pass shows it; if you only know the flight number, that is enough for us.',
          ],
        },
        {
          heading: 'If you land at the satellite',
          paragraphs: [
            'Many long-haul flights arrive at T4S. You will not leave the building there: an automated train carries you to the main T4 building, where passport control, baggage reclaim and the exit are. Everyone from T4 and T4S comes out through the same arrivals hall, and that is where your chauffeur waits.',
          ],
        },
        {
          heading: 'How long it takes',
          paragraphs: ['As a rule of thumb, from wheels down to the arrivals hall:'],
          list: [
            'Hand luggage on a flight from within the Schengen area: 15 to 25 minutes',
            'Checked bags from within Schengen: 30 to 40 minutes',
            'Long haul with passport control and checked bags: 45 minutes to over an hour',
          ],
        },
        {
          heading: 'What to tell your driver',
          paragraphs: [
            'Give the flight number rather than the scheduled time. A flight number lets us follow the aircraft and move the pickup if it lands early or late. And keep your phone on when you land — if you cannot see the name board, one message sorts it out.',
          ],
        },
      ],
      es: [
        {
          paragraphs: [
            'El aeropuerto de Madrid es, en realidad, dos aeropuertos que comparten pistas. Saber en cuál aterriza marca la diferencia entre encontrarse con su conductor en cinco minutos o deambular por un vestíbulo con el móvil sin batería.',
          ],
        },
        {
          heading: 'Dos complejos a varios kilómetros de distancia',
          paragraphs: [
            'Las terminales 1, 2 y 3 forman el complejo antiguo, comunicadas entre sí a pie. La terminal 4 y su satélite, la T4S, forman el nuevo, al otro lado del campo de vuelo y a un trayecto en coche. Un autobús lanzadera gratuito une ambos, pero no se puede ir andando.',
            'Si alguien va a recogerle, la terminal importa. Aparece en la confirmación de su reserva o en la tarjeta de embarque; si solo conoce el número de vuelo, a nosotros nos basta.',
          ],
        },
        {
          heading: 'Si aterriza en el satélite',
          paragraphs: [
            'Muchos vuelos de largo radio llegan a la T4S. No saldrá del edificio por allí: un tren automático le lleva al edificio principal de la T4, donde están el control de pasaportes, la recogida de equipajes y la salida. Todos los pasajeros de la T4 y la T4S salen por la misma sala de llegadas, y allí es donde le espera su chófer.',
          ],
        },
        {
          heading: 'Cuánto se tarda',
          paragraphs: ['Como orientación, desde que el avión toca tierra hasta la sala de llegadas:'],
          list: [
            'Equipaje de mano en un vuelo dentro del espacio Schengen: de 15 a 25 minutos',
            'Maletas facturadas dentro de Schengen: de 30 a 40 minutos',
            'Largo radio con control de pasaportes y maletas facturadas: de 45 minutos a más de una hora',
          ],
        },
        {
          heading: 'Qué decirle a su conductor',
          paragraphs: [
            'Facilite el número de vuelo en lugar de la hora prevista. Con el número de vuelo podemos seguir el avión y ajustar la recogida si aterriza antes o después. Y encienda el móvil al aterrizar: si no ve el cartel con su nombre, un mensaje lo resuelve.',
          ],
        },
      ],
    },
    cta: { href: '/services/airport-transfers', label: { en: 'Airport transfers', es: 'Traslados al aeropuerto' } },
  },
  {
    slug: 'sedan-van-or-minibus',
    date: '2026-08-18',
    minutes: 3,
    category: { en: 'Fleet', es: 'Flota' },
    title: {
      en: 'Sedan, van or minibus: sizing the car to your group',
      es: 'Berlina, monovolumen o minibús: el coche adecuado para su grupo',
    },
    excerpt: {
      en: 'The mistake is almost always the same: counting people and forgetting bags. A few rules that get it right first time.',
      es: 'El error es casi siempre el mismo: contar personas y olvidarse de las maletas. Unas reglas sencillas para acertar a la primera.',
    },
    body: {
      en: [
        {
          paragraphs: [
            'Most people choose a vehicle by counting heads. The boot, not the seats, is usually what runs out first — and discovering that on the pavement outside arrivals is an expensive way to learn it.',
          ],
        },
        {
          heading: 'Count the luggage first',
          paragraphs: ['Our capacities assume full-size suitcases:'],
          list: [
            'Sedan: up to three passengers and two large suitcases',
            'Van: up to seven passengers and five large suitcases',
            'Minibus: up to sixteen passengers, with luggage space to match',
          ],
        },
        {
          heading: 'The things people forget',
          paragraphs: [
            'A child seat takes a full place, so two adults and two small children fill a sedan before any bags go in. Golf bags, skis and folding pushchairs each count as at least one large suitcase. And three adults across the back seat of a sedan is fine for twenty minutes, less so for two hours.',
          ],
        },
        {
          heading: 'When to go up a size',
          paragraphs: [
            'If you are at the limit on either passengers or bags, take the larger vehicle. A van is often cheaper than two sedans, keeps everyone together and leaves room for the shopping you did not plan to do.',
            'For a group of eight or more, one minibus is simpler than two vans: one pickup, one arrival time and one price.',
          ],
        },
        {
          heading: 'When to go up a class instead',
          paragraphs: [
            'Size and class are different questions. If the journey is long, or the passenger is a client, a first-class sedan buys legroom and quiet rather than capacity. The booking form shows every option for your group side by side, so the comparison takes seconds.',
          ],
        },
      ],
      es: [
        {
          paragraphs: [
            'La mayoría elige el vehículo contando personas. Lo que suele quedarse corto antes no son los asientos, sino el maletero, y descubrirlo en la acera de llegadas es una forma cara de aprenderlo.',
          ],
        },
        {
          heading: 'Cuente primero el equipaje',
          paragraphs: ['Nuestras capacidades están pensadas para maletas grandes:'],
          list: [
            'Berlina: hasta tres pasajeros y dos maletas grandes',
            'Monovolumen: hasta siete pasajeros y cinco maletas grandes',
            'Minibús: hasta dieciséis pasajeros, con espacio para el equipaje de todos',
          ],
        },
        {
          heading: 'Lo que se suele olvidar',
          paragraphs: [
            'Una silla infantil ocupa una plaza completa, así que dos adultos y dos niños pequeños llenan una berlina antes de meter una sola maleta. Las bolsas de golf, los esquís y los carritos plegables cuentan, como mínimo, como una maleta grande cada uno. Y tres adultos en el asiento trasero de una berlina van bien veinte minutos, pero no tanto dos horas.',
          ],
        },
        {
          heading: 'Cuándo subir de tamaño',
          paragraphs: [
            'Si está en el límite de pasajeros o de maletas, elija el vehículo mayor. Un monovolumen suele salir más barato que dos berlinas, mantiene al grupo unido y deja sitio para las compras que no pensaba hacer.',
            'Para grupos de ocho o más, un minibús es más sencillo que dos monovolúmenes: una recogida, una hora de llegada y un precio.',
          ],
        },
        {
          heading: 'Cuándo subir de categoría',
          paragraphs: [
            'Tamaño y categoría son cuestiones distintas. Si el trayecto es largo o el pasajero es un cliente, una berlina de primera clase aporta espacio para las piernas y silencio, no capacidad. El formulario de reserva muestra todas las opciones para su grupo una junto a otra, así que comparar lleva segundos.',
          ],
        },
      ],
    },
    cta: { href: '/fleet', label: { en: 'See the fleet', es: 'Ver la flota' } },
  },
  {
    slug: 'hourly-hire-or-transfers',
    date: '2026-07-07',
    minutes: 3,
    category: { en: 'Planning', es: 'Planificación' },
    title: {
      en: 'By the hour or point to point: which costs less?',
      es: 'Por horas o trayecto a trayecto: ¿qué sale más barato?',
    },
    excerpt: {
      en: 'Two ways to book the same day. Which one is cheaper depends on the gaps between your journeys, not the journeys themselves.',
      es: 'Dos maneras de reservar el mismo día. Cuál resulta más económica depende de los huecos entre trayectos, no de los trayectos en sí.',
    },
    body: {
      en: [
        {
          paragraphs: [
            'You can book a chauffeur in two ways: single transfers, each priced by distance, or the car by the hour, priced by time. For a simple airport run the answer is obvious. For a day with several stops it is worth thirty seconds of thought.',
          ],
        },
        {
          heading: 'Transfers suit journeys that are far apart',
          paragraphs: [
            'If you need a ride to a lunch at one and a ride home at five, two transfers are almost always cheaper. You are not paying for four hours of a car sitting outside a restaurant. A return booking is exactly this: two transfers with one confirmation.',
          ],
        },
        {
          heading: 'Hourly hire suits days that are busy',
          paragraphs: [
            'Once the stops come closer together, the sums change. Three or four meetings in an afternoon means three or four minimum fares, plus the risk of waiting for the next car each time. By the hour, the same car is outside when you walk out, and the price is known before the day begins.',
          ],
          list: [
            'Three or more stops in a few hours: usually hourly',
            'An uncertain finishing time: hourly',
            'Two journeys with a long gap: transfers',
            'One long motorway run: a transfer',
          ],
        },
        {
          heading: 'Compare before you book',
          paragraphs: [
            'You do not have to guess. Enter the journey in the booking form as a transfer, note the price, then switch the ride type to hourly and choose the number of hours. Both prices are fixed, so the comparison is exact.',
          ],
        },
      ],
      es: [
        {
          paragraphs: [
            'Hay dos maneras de reservar un chófer: traslados sueltos, cada uno con un precio según la distancia, o el coche por horas, con un precio según el tiempo. Para un simple trayecto al aeropuerto la respuesta es evidente. Para un día con varias paradas merece la pena pensarlo treinta segundos.',
          ],
        },
        {
          heading: 'Los traslados convienen cuando los trayectos están muy separados',
          paragraphs: [
            'Si necesita un coche para ir a comer a la una y otro para volver a casa a las cinco, dos traslados son casi siempre más económicos. No paga cuatro horas de un coche parado ante un restaurante. Una reserva de ida y vuelta es exactamente eso: dos traslados con una sola confirmación.',
          ],
        },
        {
          heading: 'El servicio por horas conviene en los días con mucho movimiento',
          paragraphs: [
            'Cuando las paradas se acercan entre sí, las cuentas cambian. Tres o cuatro reuniones en una tarde suponen tres o cuatro tarifas mínimas, además del riesgo de esperar al siguiente coche cada vez. Por horas, el mismo coche está en la puerta cuando usted sale y el precio se conoce antes de empezar el día.',
          ],
          list: [
            'Tres o más paradas en pocas horas: normalmente por horas',
            'Hora de finalización incierta: por horas',
            'Dos trayectos con un hueco largo: traslados',
            'Un trayecto largo por autovía: traslado',
          ],
        },
        {
          heading: 'Compare antes de reservar',
          paragraphs: [
            'No hace falta adivinar. Introduzca el trayecto en el formulario como traslado, anote el precio, cambie el tipo de servicio a «por horas» y elija el número de horas. Los dos precios son cerrados, así que la comparación es exacta.',
          ],
        },
      ],
    },
    cta: { href: '/services/hourly-chauffeur', label: { en: 'Hourly chauffeur', es: 'Chófer por horas' } },
  },
  {
    slug: 'choosing-a-day-trip-from-madrid',
    date: '2026-06-02',
    minutes: 4,
    category: { en: 'Day trips', es: 'Excursiones' },
    title: {
      en: 'Toledo, Segovia or Ávila: choosing a day trip from Madrid',
      es: 'Toledo, Segovia o Ávila: cómo elegir una excursión desde Madrid',
    },
    excerpt: {
      en: 'Three World Heritage cities within an hour and a half. They are not interchangeable — here is how to pick the one that suits your day.',
      es: 'Tres ciudades Patrimonio de la Humanidad a menos de hora y media. No son intercambiables: así puede elegir la que mejor encaja con su día.',
    },
    body: {
      en: [
        {
          paragraphs: [
            'Visitors with one free day in Madrid usually ask the same question. All three cities are worth the drive; which is best depends on what you want from the day and who is travelling.',
          ],
        },
        {
          heading: 'Toledo: the most to see',
          paragraphs: [
            'The closest of the three and the richest in monuments: a cathedral, a fortress, synagogues and mosques packed onto one rock above the Tagus. It is also the steepest and the busiest. Choose it for a first visit, and ask for the Mirador del Valle on the way in for the view of the whole city.',
          ],
        },
        {
          heading: 'Segovia: the best lunch',
          paragraphs: [
            'A Roman aqueduct at the entrance, a castle at the far end and a compact old town in between that is easy to walk. Segovia is the one for people who want a long Castilian lunch as much as the sights. The drive crosses the Guadarrama mountains, and the royal gardens of La Granja are a short detour.',
          ],
        },
        {
          heading: 'Ávila: the quietest',
          paragraphs: [
            'Complete medieval walls you can walk along, and far fewer visitors than the other two. Ávila is higher and cooler than Madrid, which is welcome in July and worth a coat in January. It suits a half-day visit, or pairs with Segovia for a full one.',
          ],
        },
        {
          heading: 'A quick way to decide',
          paragraphs: [],
          list: [
            'One day, first time in Spain: Toledo',
            'Food comes first: Segovia',
            'Avoiding crowds, or a summer heatwave: Ávila',
            'Limited mobility: Segovia or Ávila, which are flatter than Toledo',
            'Only half a day: El Escorial, fifty minutes from the centre',
          ],
        },
      ],
      es: [
        {
          paragraphs: [
            'Quien dispone de un día libre en Madrid suele hacerse la misma pregunta. Las tres ciudades merecen el viaje; cuál es la mejor depende de lo que espere del día y de quién viaje.',
          ],
        },
        {
          heading: 'Toledo: la que más tiene que ver',
          paragraphs: [
            'La más cercana de las tres y la más rica en monumentos: catedral, alcázar, sinagogas y mezquitas reunidos sobre un mismo peñón junto al Tajo. También es la más empinada y la más concurrida. Elíjala para una primera visita y pida parar en el Mirador del Valle a la llegada para ver la ciudad entera.',
          ],
        },
        {
          heading: 'Segovia: la mejor comida',
          paragraphs: [
            'Un acueducto romano a la entrada, un alcázar al fondo y, entre ambos, un casco antiguo compacto que se recorre fácilmente a pie. Segovia es para quien quiere una larga comida castellana tanto como los monumentos. El trayecto cruza la sierra de Guadarrama y los jardines reales de La Granja quedan a un breve desvío.',
          ],
        },
        {
          heading: 'Ávila: la más tranquila',
          paragraphs: [
            'Murallas medievales completas por las que se puede pasear y muchos menos visitantes que en las otras dos. Ávila está más alta y es más fresca que Madrid, algo que se agradece en julio y que pide abrigo en enero. Es ideal para medio día, o combinada con Segovia para una jornada completa.',
          ],
        },
        {
          heading: 'Una forma rápida de decidir',
          paragraphs: [],
          list: [
            'Un solo día y primera vez en España: Toledo',
            'La comida es lo primero: Segovia',
            'Para evitar aglomeraciones o una ola de calor: Ávila',
            'Movilidad reducida: Segovia o Ávila, más llanas que Toledo',
            'Solo medio día: El Escorial, a cincuenta minutos del centro',
          ],
        },
      ],
    },
    cta: { href: '/routes', label: { en: 'See the routes', es: 'Ver las rutas' } },
  },
]

export const articleBySlug = (slug: string) => articles.find((article) => article.slug === slug)
