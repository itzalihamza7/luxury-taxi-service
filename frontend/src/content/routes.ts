import type { Localized } from '@/i18n/config'

export interface RouteGuide {
  slug: string
  /** Place id used to prefill the booking form's drop-off. */
  destinationId: string
  city: Localized
  /** Road distance and typical drive time from central Madrid (checked against a routing engine). */
  km: number
  minutes: number
  road: string
  summary: Localized
  /** Page heading; `*word*` marks the italic accent. */
  heading: Localized
  intro: Localized
  journey: Localized<string[]>
  highlights: Localized<string[]>
  /** An honest comparison: when the train wins, and when the car does. */
  train: Localized
  car: Localized
  vehicles: string[]
  faqs: { question: Localized; answer: Localized }[]
}

export const routes: RouteGuide[] = [
  {
    slug: 'madrid-to-toledo',
    destinationId: 'cat:toledo',
    city: { en: 'Toledo', es: 'Toledo' },
    km: 73,
    minutes: 60,
    road: 'A-42',
    summary: {
      en: 'An hour down the A-42 to a hilltop city of three cultures — with the viewpoint stop the train cannot make.',
      es: 'Una hora por la A-42 hasta la ciudad de las tres culturas, con la parada en el mirador que el tren no puede hacer.',
    },
    heading: { en: 'Madrid to Toledo, *door to old town*', es: 'De Madrid a Toledo, *hasta el casco histórico*' },
    intro: {
      en: 'Around 73 km and about an hour by motorway. Toledo sits on a rock ringed by the Tagus, and a car takes you to the gates of the old town rather than to a station below it.',
      es: 'Unos 73 km y cerca de una hora por autovía. Toledo se alza sobre un peñón rodeado por el Tajo, y un coche le deja a las puertas del casco histórico en lugar de en una estación a sus pies.',
    },
    journey: {
      en: [
        'The A-42 runs south from Madrid as motorway the whole way: no mountain passes and little to slow you outside rush hour. Toledo appears on its hill several minutes before you arrive.',
        'We collect you from your hotel, home, the airport or Atocha, and drop you as close to the centre as traffic rules allow — usually at the Puerta de Bisagra or beside the escalators that carry you up into the old town.',
      ],
      es: [
        'La A-42 baja hacia el sur desde Madrid siendo autovía en todo el recorrido: sin puertos de montaña y con pocas retenciones fuera de las horas punta. Toledo aparece sobre su colina varios minutos antes de llegar.',
        'Le recogemos en su hotel, en casa, en el aeropuerto o en Atocha, y le dejamos tan cerca del centro como permite la normativa de tráfico: normalmente en la Puerta de Bisagra o junto a las escaleras mecánicas que suben al casco histórico.',
      ],
    },
    highlights: {
      en: [
        'Mirador del Valle: the postcard view of the whole city, a short detour by car',
        'The Cathedral and the Alcázar, both inside the walls',
        'The old Jewish quarter and its synagogues',
        'A long lunch without a train to catch',
      ],
      es: [
        'Mirador del Valle: la vista de postal de toda la ciudad, a un breve desvío en coche',
        'La Catedral y el Alcázar, ambos dentro de las murallas',
        'La judería y sus sinagogas',
        'Una comida larga sin tren que coger',
      ],
    },
    train: {
      en: 'The high-speed train from Atocha takes about half an hour — faster than any car. If you are one or two people travelling light and happy to walk or take a bus up from the station, it is a perfectly good choice. Book ahead: weekend seats sell out.',
      es: 'El tren de alta velocidad desde Atocha tarda cerca de media hora, más rápido que cualquier coche. Si son una o dos personas con poco equipaje y no les importa subir a pie o en autobús desde la estación, es una opción estupenda. Reserve con antelación: los fines de semana se agotan las plazas.',
    },
    car: {
      en: 'The car wins with three or more people, with luggage, with anyone who would rather not climb the hill, when you want the Mirador del Valle, or when you need to leave at a time of your own choosing.',
      es: 'El coche gana cuando son tres o más personas, llevan equipaje, alguien prefiere no subir la cuesta, quieren parar en el Mirador del Valle o necesitan salir a la hora que ustedes decidan.',
    },
    vehicles: ['mercedes-e-class', 'mercedes-v-class', 'mercedes-sprinter'],
    faqs: [
      {
        question: { en: 'How long is the drive?', es: '¿Cuánto dura el trayecto?' },
        answer: {
          en: 'About an hour each way. Allow 15–20 minutes more if you leave Madrid in the morning rush.',
          es: 'Alrededor de una hora por trayecto. Calcule 15 o 20 minutos más si sale de Madrid en hora punta de la mañana.',
        },
      },
      {
        question: { en: 'Can the chauffeur wait and bring us back?', es: '¿Puede esperarnos el chófer y traernos de vuelta?' },
        answer: {
          en: 'Yes. Book a return with the time you want collecting, or choose hourly hire to keep the same car with you all day.',
          es: 'Sí. Reserve ida y vuelta con la hora de recogida que prefiera, o elija el servicio por horas para tener el mismo coche todo el día.',
        },
      },
      {
        question: { en: 'Can we be dropped inside the old town?', es: '¿Pueden dejarnos dentro del casco histórico?' },
        answer: {
          en: 'As close as the rules allow. Some central streets are closed to traffic, so the usual drop-off is the Puerta de Bisagra or the escalators — a few minutes on foot from the Cathedral.',
          es: 'Tan cerca como permita la normativa. Algunas calles del centro están cerradas al tráfico, así que lo habitual es parar en la Puerta de Bisagra o en las escaleras mecánicas, a pocos minutos a pie de la Catedral.',
        },
      },
    ],
  },
  {
    slug: 'madrid-to-segovia',
    destinationId: 'cat:segovia',
    city: { en: 'Segovia', es: 'Segovia' },
    km: 91,
    minutes: 75,
    road: 'AP-6 / AP-61',
    summary: {
      en: 'Through the Guadarrama mountains to a Roman aqueduct, a fairy-tale castle and the best roast in Castile.',
      es: 'A través de la sierra de Guadarrama hasta un acueducto romano, un alcázar de cuento y el mejor asado de Castilla.',
    },
    heading: { en: 'Madrid to Segovia, *across the sierra*', es: 'De Madrid a Segovia, *cruzando la sierra*' },
    intro: {
      en: 'About 91 km and an hour and a quarter. The road climbs out of Madrid, passes under the Guadarrama range and comes down onto the Castilian plain, where the aqueduct marks the entrance to the city.',
      es: 'Unos 91 km y una hora y cuarto. La carretera sale de Madrid en ascenso, atraviesa la sierra de Guadarrama por el túnel y desciende a la meseta castellana, donde el acueducto marca la entrada a la ciudad.',
    },
    journey: {
      en: [
        'You leave on the A-6, join the AP-6 toll motorway through the Guadarrama tunnel and take the AP-61 into Segovia. In winter the pass can see snow; the motorway is kept clear, and we plan extra time when the forecast calls for it.',
        'The drop-off is at the foot of the aqueduct, in the Plaza del Azoguejo — the natural starting point for the walk up through the old town to the Cathedral and the Alcázar.',
      ],
      es: [
        'Se sale por la A-6, se toma la autopista de peaje AP-6 por el túnel de Guadarrama y se continúa por la AP-61 hasta Segovia. En invierno puede nevar en el puerto; la autopista se mantiene despejada y prevemos más tiempo cuando la previsión lo aconseja.',
        'La parada es al pie del acueducto, en la plaza del Azoguejo: el punto de partida natural para subir por el casco antiguo hasta la Catedral y el Alcázar.',
      ],
    },
    highlights: {
      en: [
        'The Roman aqueduct, two thousand years old and still standing without mortar',
        'The Alcázar, on its rock above two rivers',
        'Roast suckling pig at one of the classic mesones',
        'The royal gardens of La Granja, 15 minutes away by car',
      ],
      es: [
        'El acueducto romano: dos mil años en pie y sin argamasa',
        'El Alcázar, sobre su roca entre dos ríos',
        'Cochinillo asado en uno de los mesones clásicos',
        'Los jardines reales de La Granja, a 15 minutos en coche',
      ],
    },
    train: {
      en: 'The high-speed train from Chamartín takes under half an hour, but it arrives at Segovia-Guiomar, a station several kilometres outside the city: you then need a bus or taxi into town. For one or two people it is still quick and good value.',
      es: 'El tren de alta velocidad desde Chamartín tarda menos de media hora, pero llega a Segovia-Guiomar, una estación situada a varios kilómetros de la ciudad: después hace falta autobús o taxi hasta el centro. Para una o dos personas sigue siendo rápido y económico.',
    },
    car: {
      en: 'The car wins for groups and families, for anyone who wants La Granja or Pedraza in the same day, and for a relaxed return after lunch instead of a fixed train.',
      es: 'El coche gana para grupos y familias, para quien quiera incluir La Granja o Pedraza en el mismo día y para volver con calma después de comer, sin depender de un tren con hora fija.',
    },
    vehicles: ['mercedes-e-class', 'mercedes-v-class', 'mercedes-sprinter'],
    faqs: [
      {
        question: { en: 'Is the road difficult in winter?', es: '¿Es complicada la carretera en invierno?' },
        answer: {
          en: 'The route uses a motorway tunnel under the mountains, so it stays open in almost all conditions. On snowy days we allow extra time and keep you informed.',
          es: 'La ruta utiliza un túnel de autopista bajo la sierra, por lo que permanece abierta en casi cualquier circunstancia. Los días de nieve prevemos más tiempo y le mantenemos informado.',
        },
      },
      {
        question: { en: 'Can we add La Granja?', es: '¿Podemos añadir La Granja?' },
        answer: {
          en: 'Yes, it is a short drive from Segovia. Choose hourly hire, or mention it in the booking notes so we can plan the day.',
          es: 'Sí, está a poca distancia de Segovia. Elija el servicio por horas o indíquelo en las notas de la reserva para que planifiquemos el día.',
        },
      },
      {
        question: { en: 'How long should we stay?', es: '¿Cuánto tiempo conviene quedarse?' },
        answer: {
          en: 'Five to six hours covers the aqueduct, the Cathedral, the Alcázar and an unhurried lunch.',
          es: 'Entre cinco y seis horas bastan para ver el acueducto, la Catedral y el Alcázar y comer sin prisas.',
        },
      },
    ],
  },
  {
    slug: 'madrid-to-avila',
    destinationId: 'cat:avila',
    city: { en: 'Ávila', es: 'Ávila' },
    km: 111,
    minutes: 85,
    road: 'A-6 / AP-51',
    summary: {
      en: 'The most complete medieval walls in Spain, an hour and a half from Madrid — and far quieter than Toledo.',
      es: 'Las murallas medievales mejor conservadas de España, a hora y media de Madrid y mucho más tranquilas que Toledo.',
    },
    heading: { en: 'Madrid to Ávila, *inside the walls*', es: 'De Madrid a Ávila, *intramuros*' },
    intro: {
      en: 'About 111 km and just under an hour and a half. Ávila is Spain’s highest provincial capital, and its walls — complete, with their towers and gates — come into view across the plateau well before you arrive.',
      es: 'Unos 111 km y algo menos de hora y media. Ávila es la capital de provincia más alta de España, y sus murallas —completas, con sus torres y sus puertas— se divisan sobre la meseta mucho antes de llegar.',
    },
    journey: {
      en: [
        'The route follows the A-6 and AP-6 through the Guadarrama tunnel, then the AP-51 to Ávila. It is motorway all the way and usually quiet once you are past the mountains.',
        'Ávila is over 1,100 metres above sea level, so it is noticeably cooler than Madrid in every season. Bring a layer, even in summer evenings.',
      ],
      es: [
        'La ruta sigue la A-6 y la AP-6 por el túnel de Guadarrama y continúa por la AP-51 hasta Ávila. Es autopista en todo el recorrido y suele ir despejada una vez pasada la sierra.',
        'Ávila está a más de 1.100 metros de altitud, así que hace bastante más fresco que en Madrid en cualquier época. Lleve algo de abrigo, incluso en las noches de verano.',
      ],
    },
    highlights: {
      en: [
        'A walk along the top of the walls',
        'Los Cuatro Postes: the view of the whole walled city, best reached by car',
        'The Cathedral, built into the wall itself',
        'Local beef and the traditional yemas for dessert',
      ],
      es: [
        'Un paseo por el adarve de la muralla',
        'Los Cuatro Postes: la vista de toda la ciudad amurallada, a la que se llega mejor en coche',
        'La Catedral, integrada en la propia muralla',
        'Chuletón de Ávila y las tradicionales yemas de postre',
      ],
    },
    train: {
      en: 'There is no high-speed line: regional trains take around an hour and a half, about the same as driving, and run less often. It works if the timetable suits you and you are happy to stay within the walls.',
      es: 'No hay línea de alta velocidad: los trenes regionales tardan en torno a hora y media, más o menos lo mismo que en coche, y pasan con menos frecuencia. Es una buena opción si el horario le encaja y piensa quedarse dentro de las murallas.',
    },
    car: {
      en: 'The car wins here more clearly than on the other routes: the same journey time, a door-to-door ride, the Cuatro Postes viewpoint, and the option of combining Ávila with Segovia in one day.',
      es: 'Aquí el coche gana con más claridad que en las otras rutas: el mismo tiempo de viaje, trayecto de puerta a puerta, el mirador de los Cuatro Postes y la posibilidad de combinar Ávila con Segovia en un mismo día.',
    },
    vehicles: ['mercedes-e-class', 'mercedes-s-class', 'mercedes-v-class'],
    faqs: [
      {
        question: { en: 'Can we see Ávila and Segovia in one day?', es: '¿Podemos ver Ávila y Segovia en un día?' },
        answer: {
          en: 'Yes — they are about an hour apart and combine well. Choose hourly hire for a ten to twelve hour day, and start early.',
          es: 'Sí: están a una hora aproximadamente la una de la otra y combinan bien. Elija el servicio por horas para una jornada de diez a doce horas y salga temprano.',
        },
      },
      {
        question: { en: 'Is half a day enough?', es: '¿Basta con medio día?' },
        answer: {
          en: 'The old town is compact: three to four hours covers the walls, the Cathedral and lunch. With travel, plan on seven hours door to door.',
          es: 'El casco antiguo es compacto: en tres o cuatro horas se ven las murallas y la Catedral y da tiempo a comer. Con el viaje, calcule unas siete horas de puerta a puerta.',
        },
      },
    ],
  },
  {
    slug: 'madrid-to-el-escorial',
    destinationId: 'cat:el-escorial',
    city: { en: 'El Escorial', es: 'El Escorial' },
    km: 47,
    minutes: 50,
    road: 'A-6 / M-505',
    summary: {
      en: 'Philip II’s vast monastery-palace in the foothills of the sierra: the closest of the classic day trips.',
      es: 'El inmenso monasterio-palacio de Felipe II a los pies de la sierra: la más cercana de las excursiones clásicas.',
    },
    heading: { en: 'Madrid to El Escorial, *the short escape*', es: 'De Madrid a El Escorial, *la escapada corta*' },
    intro: {
      en: 'About 47 km and fifty minutes. San Lorenzo de El Escorial is close enough for a half day, and cool enough in summer that Madrid has been escaping there for centuries.',
      es: 'Unos 47 km y cincuenta minutos. San Lorenzo de El Escorial está lo bastante cerca para medio día y es lo bastante fresco en verano como para que Madrid lleve siglos escapándose allí.',
    },
    journey: {
      en: [
        'You leave Madrid on the A-6 and turn onto the M-505, which climbs gently towards the mountains. The monastery’s grey granite bulk is visible from several kilometres away.',
        'We drop you beside the monastery, in the upper town. That matters: the railway station is in the lower town, a steep walk or a bus ride below.',
      ],
      es: [
        'Se sale de Madrid por la A-6 y se toma la M-505, que asciende suavemente hacia la sierra. La mole de granito gris del monasterio se ve desde varios kilómetros antes.',
        'Le dejamos junto al monasterio, en la parte alta. Es un detalle importante: la estación de tren está en la parte baja, a una cuesta empinada o un trayecto en autobús de distancia.',
      ],
    },
    highlights: {
      en: [
        'The Royal Monastery: basilica, library and the royal pantheon',
        'The Silla de Felipe II viewpoint, in the woods above the town',
        'Lunch on a terrace in the upper town',
        'An easy pairing with a walk in the Guadarrama foothills',
      ],
      es: [
        'El Real Monasterio: basílica, biblioteca y panteón de reyes',
        'El mirador de la Silla de Felipe II, en el bosque sobre el pueblo',
        'Comida en una terraza de la parte alta',
        'Fácil de combinar con un paseo por la sierra de Guadarrama',
      ],
    },
    train: {
      en: 'Commuter trains run from central Madrid in about an hour and are inexpensive. The catch is the last stretch: from the station it is a steep uphill walk or a local bus to the monastery.',
      es: 'Los trenes de Cercanías salen del centro de Madrid, tardan alrededor de una hora y son económicos. El inconveniente es el último tramo: desde la estación hay que subir una cuesta pronunciada a pie o en autobús urbano hasta el monasterio.',
    },
    car: {
      en: 'The car wins for a half-day visit, for anyone who would struggle with the hill, and when you want the Silla de Felipe II, which has no public transport.',
      es: 'El coche gana para una visita de medio día, para quien tenga dificultad con la cuesta y cuando se quiere subir a la Silla de Felipe II, adonde no llega el transporte público.',
    },
    vehicles: ['mercedes-e-class', 'mercedes-v-class', 'toyota-yaris'],
    faqs: [
      {
        question: { en: 'Is the monastery open every day?', es: '¿Abre el monasterio todos los días?' },
        answer: {
          en: 'It is normally closed on Mondays, and hours change with the season. Check the official opening times before you book your date.',
          es: 'Normalmente cierra los lunes y el horario varía según la temporada. Consulte el horario oficial antes de elegir la fecha.',
        },
      },
      {
        question: { en: 'How long do we need?', es: '¿Cuánto tiempo se necesita?' },
        answer: {
          en: 'Two to three hours for the monastery, plus lunch if you wish. A comfortable half day from Madrid.',
          es: 'Dos o tres horas para el monasterio, más la comida si lo desea. Un medio día cómodo desde Madrid.',
        },
      },
    ],
  },
]

export const routeBySlug = (slug: string) => routes.find((route) => route.slug === slug)
