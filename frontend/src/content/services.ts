import type { Localized } from '@/i18n/config'
import type { RideType } from '@/lib/types'

export interface Service {
  slug: string
  /** The ride type preselected when booking from this service's page. */
  rideType: RideType
  icon: 'plane' | 'clock' | 'city' | 'route' | 'map'
  title: Localized
  /** One or two sentences for cards and search results. */
  summary: Localized
  /** Page heading; `*word*` marks the italic accent. */
  heading: Localized
  intro: Localized<string[]>
  includes: Localized<string[]>
  idealFor: Localized<string[]>
  /** Slugs of the vehicles recommended for this service, in order. */
  vehicles: string[]
  faqs: { question: Localized; answer: Localized }[]
}

export const services: Service[] = [
  {
    slug: 'airport-transfers',
    rideType: 'airport',
    icon: 'plane',
    title: { en: 'Airport transfers', es: 'Traslados al aeropuerto' },
    summary: {
      en: 'Met in arrivals at Madrid–Barajas, luggage handled, flight tracked. A fixed price whatever the traffic.',
      es: 'Recogida en llegadas de Madrid–Barajas, equipaje atendido y vuelo monitorizado. Precio cerrado, haya el tráfico que haya.',
    },
    heading: { en: 'Madrid airport transfers, *without the queue*', es: 'Traslados al aeropuerto de Madrid, *sin colas*' },
    intro: {
      en: [
        'Your chauffeur follows your flight, so an early landing or a two-hour delay changes nothing for you: the car is there when you walk out. They wait in the arrivals hall with a name board, take the luggage and walk you to the car.',
        'We serve every terminal at Adolfo Suárez Madrid–Barajas — T1, T2, T3, T4 and the T4S satellite — and arrange transfers at other Spanish airports on request. The price you see when you book is the price you pay.',
      ],
      es: [
        'Su chófer sigue su vuelo, de modo que un aterrizaje anticipado o un retraso de dos horas no cambian nada para usted: el coche está allí cuando sale. Le espera en la sala de llegadas con un cartel con su nombre, se ocupa del equipaje y le acompaña al vehículo.',
        'Atendemos todas las terminales de Adolfo Suárez Madrid–Barajas —T1, T2, T3, T4 y el satélite T4S— y organizamos traslados en otros aeropuertos españoles bajo petición. El precio que ve al reservar es el precio que paga.',
      ],
    },
    includes: {
      en: [
        'Meet & greet in the arrivals hall with a name board',
        'Flight tracking: the pickup follows your real landing time',
        'Help with luggage, door to door',
        'Fixed price including VAT, agreed before you travel',
      ],
      es: [
        'Recogida en la sala de llegadas con cartel con su nombre',
        'Seguimiento del vuelo: la recogida se adapta a la hora real de aterrizaje',
        'Ayuda con el equipaje, de puerta a puerta',
        'Precio cerrado con IVA incluido, acordado antes de viajar',
      ],
    },
    idealFor: {
      en: ['Arrivals after a long flight', 'Early-morning departures', 'Families with luggage and pushchairs', 'Clients and guests you want met properly'],
      es: ['Llegadas tras un vuelo largo', 'Salidas de madrugada', 'Familias con equipaje y carritos', 'Clientes e invitados a los que quiere recibir como merecen'],
    },
    vehicles: ['mercedes-e-class', 'mercedes-v-class', 'mercedes-sprinter'],
    faqs: [
      {
        question: { en: 'Where will my chauffeur be waiting?', es: '¿Dónde me esperará el chófer?' },
        answer: {
          en: 'In the arrivals hall of your terminal, just past customs, holding a board with your name. If you cannot find each other, call or WhatsApp us and we will connect you straight away.',
          es: 'En la sala de llegadas de su terminal, justo después de la aduana, con un cartel con su nombre. Si no se encuentran, llámenos o escríbanos por WhatsApp y les pondremos en contacto de inmediato.',
        },
      },
      {
        question: { en: 'What if my flight is delayed?', es: '¿Y si mi vuelo se retrasa?' },
        answer: {
          en: 'Add your flight number when you book. We follow the flight and move the pickup to the real landing time, so you do not need to call us.',
          es: 'Indique su número de vuelo al reservar. Seguimos el vuelo y ajustamos la recogida a la hora real de aterrizaje, sin que tenga que llamarnos.',
        },
      },
      {
        question: { en: 'Which terminal should I choose?', es: '¿Qué terminal debo elegir?' },
        answer: {
          en: 'Madrid–Barajas has four terminals plus the T4S satellite. Choose yours if you know it; if not, your flight number tells us. For departures we drop you at the door closest to your check-in desks.',
          es: 'Madrid–Barajas tiene cuatro terminales y el satélite T4S. Elija la suya si la conoce; si no, su número de vuelo nos lo indica. En las salidas le dejamos en la puerta más cercana a sus mostradores de facturación.',
        },
      },
      {
        question: { en: 'How far ahead should I book?', es: '¿Con cuánta antelación debo reservar?' },
        answer: {
          en: 'Online booking closes two hours before pickup. For early-morning departures and larger vehicles, booking the day before is safer. For anything more urgent, call or WhatsApp us.',
          es: 'La reserva online se cierra dos horas antes de la recogida. Para salidas de madrugada y vehículos grandes es más seguro reservar el día anterior. Si es más urgente, llámenos o escríbanos por WhatsApp.',
        },
      },
    ],
  },
  {
    slug: 'hourly-chauffeur',
    rideType: 'hourly',
    icon: 'clock',
    title: { en: 'Hourly chauffeur', es: 'Chófer por horas' },
    summary: {
      en: 'A car and chauffeur at your disposal for as long as you need — meetings, shopping, an evening out.',
      es: 'Coche y chófer a su disposición el tiempo que necesite: reuniones, compras o una noche fuera.',
    },
    heading: { en: 'A chauffeur *on your schedule*', es: 'Un chófer *a su ritmo*' },
    intro: {
      en: [
        'Book the car by the hour and decide the route as you go. Your chauffeur waits while you are in a meeting, at lunch or in a shop, and is ready when you come out — no rebooking, no waiting for the next car.',
        'Hourly hire runs from two to twelve hours and is priced per hour, so you know the cost of the day before it starts. With three or more stops it is usually the better choice than several separate transfers.',
      ],
      es: [
        'Reserve el coche por horas y decida la ruta sobre la marcha. Su chófer espera mientras usted está en una reunión, almorzando o de compras, y está listo cuando sale: sin nuevas reservas ni esperas.',
        'El servicio por horas va de dos a doce horas y se factura por hora, así que conoce el coste del día antes de empezar. Con tres o más paradas suele compensar más que varios traslados sueltos.',
      ],
    },
    includes: {
      en: ['The same car and chauffeur throughout', 'As many stops as you need', 'Waiting between stops included in the hourly rate', 'A fixed hourly price, including VAT'],
      es: ['El mismo coche y el mismo chófer todo el tiempo', 'Tantas paradas como necesite', 'Esperas entre paradas incluidas en la tarifa por hora', 'Precio por hora cerrado, con IVA incluido'],
    },
    idealFor: {
      en: ['A day of meetings across the city', 'Roadshows and site visits', 'Shopping on Calle de Serrano', 'Dinner and theatre evenings'],
      es: ['Un día de reuniones por la ciudad', 'Roadshows y visitas a instalaciones', 'Compras en la calle de Serrano', 'Noches de cena y teatro'],
    },
    vehicles: ['mercedes-e-class', 'mercedes-s-class', 'mercedes-v-class'],
    faqs: [
      {
        question: { en: 'What is the minimum booking?', es: '¿Cuál es la reserva mínima?' },
        answer: {
          en: 'Two hours. You can book up to twelve hours online; for longer days or several days in a row, contact us.',
          es: 'Dos horas. Puede reservar hasta doce horas online; para jornadas más largas o varios días seguidos, contacte con nosotros.',
        },
      },
      {
        question: { en: 'Can I change the plan during the day?', es: '¿Puedo cambiar el plan durante el día?' },
        answer: {
          en: 'Yes — that is the point of hourly hire. Tell your chauffeur where you need to go next. If the day runs longer than booked, they will agree the extra time with you first.',
          es: 'Sí, esa es la ventaja del servicio por horas. Indique a su chófer adónde quiere ir a continuación. Si el día se alarga más de lo reservado, acordará antes con usted el tiempo adicional.',
        },
      },
      {
        question: { en: 'Can the car leave Madrid?', es: '¿Puede salir el coche de Madrid?' },
        answer: {
          en: 'Yes. For day trips to Toledo, Segovia or Ávila, hourly hire keeps the same car with you all day. For a simple one-way journey, a city-to-city transfer is usually cheaper.',
          es: 'Sí. Para excursiones a Toledo, Segovia o Ávila, el servicio por horas mantiene el mismo coche con usted todo el día. Para un trayecto de solo ida, un traslado entre ciudades suele salir más económico.',
        },
      },
    ],
  },
  {
    slug: 'madrid-city-rides',
    rideType: 'local',
    icon: 'city',
    title: { en: 'Madrid city rides', es: 'Trayectos en Madrid' },
    summary: {
      en: 'Point-to-point rides across the city: hotel to restaurant, office to station, home to the Bernabéu.',
      es: 'Trayectos puerta a puerta por la ciudad: del hotel al restaurante, de la oficina a la estación, de casa al Bernabéu.',
    },
    heading: { en: 'Across Madrid, *door to door*', es: 'Por Madrid, *de puerta a puerta*' },
    intro: {
      en: [
        'For the journeys where a taxi would do, but you would rather know who is driving, what the car is and what it costs before you set off. Booked for a set time, the car is outside when you are ready.',
        'Your chauffeur knows the city: where the low-emission zone restricts access, which hotel entrance is the quiet one, and how long the Castellana really takes at six in the evening.',
      ],
      es: [
        'Para esos trayectos en los que bastaría un taxi, pero prefiere saber quién conduce, qué coche es y cuánto cuesta antes de salir. Reservado a una hora concreta, el coche está en la puerta cuando usted esté listo.',
        'Su chófer conoce la ciudad: dónde restringe el acceso la zona de bajas emisiones, qué entrada del hotel es la más tranquila y cuánto se tarda de verdad en recorrer la Castellana a las seis de la tarde.',
      ],
    },
    includes: {
      en: ['Pickup at the exact time you choose', 'A vehicle class you chose, not whatever is nearby', 'Fixed price including VAT', 'Bottled water, Wi-Fi and chargers on board'],
      es: ['Recogida a la hora exacta que usted elija', 'La categoría de vehículo que ha elegido, no la que esté más cerca', 'Precio cerrado con IVA incluido', 'Agua, wifi y cargadores a bordo'],
    },
    idealFor: {
      en: ['Dinner reservations and theatre nights', 'Hotel to IFEMA or a client’s office', 'Station transfers to Atocha and Chamartín', 'Match days and concerts'],
      es: ['Cenas con reserva y noches de teatro', 'Del hotel a IFEMA o a la oficina de un cliente', 'Traslados a las estaciones de Atocha y Chamartín', 'Días de partido y conciertos'],
    },
    vehicles: ['toyota-yaris', 'mercedes-e-class', 'mercedes-s-class'],
    faqs: [
      {
        question: { en: 'How is this different from a taxi?', es: '¿En qué se diferencia de un taxi?' },
        answer: {
          en: 'You choose the vehicle class, the price is fixed when you book rather than metered, and the car is reserved for your time instead of hailed. It suits planned journeys; for a spur-of-the-moment ride, a taxi is quicker.',
          es: 'Usted elige la categoría del vehículo, el precio queda cerrado al reservar en lugar de depender del taxímetro, y el coche se reserva para su hora en vez de pararse en la calle. Es ideal para trayectos planificados; para un trayecto improvisado, un taxi es más rápido.',
        },
      },
      {
        question: { en: 'Can you take us there and bring us back later?', es: '¿Pueden llevarnos y recogernos después?' },
        answer: {
          en: 'Yes. Book a return and enter the time you want collecting. If you are not sure when you will finish, hourly hire keeps the car on standby.',
          es: 'Sí. Reserve ida y vuelta e indique la hora a la que quiere que le recojamos. Si no sabe cuándo terminará, el servicio por horas mantiene el coche a su disposición.',
        },
      },
      {
        question: { en: 'Do you cover the whole Madrid region?', es: '¿Cubren toda la Comunidad de Madrid?' },
        answer: {
          en: 'Yes — the city and the surrounding towns, including Pozuelo, Las Rozas, Alcobendas and Alcalá de Henares.',
          es: 'Sí: la ciudad y los municipios de alrededor, como Pozuelo, Las Rozas, Alcobendas y Alcalá de Henares.',
        },
      },
    ],
  },
  {
    slug: 'city-to-city',
    rideType: 'city_to_city',
    icon: 'route',
    title: { en: 'City to city', es: 'Entre ciudades' },
    summary: {
      en: 'Madrid to anywhere in mainland Spain, door to door, at a price fixed before you leave.',
      es: 'De Madrid a cualquier punto de la península, puerta a puerta y con precio cerrado antes de salir.',
    },
    heading: { en: 'Madrid to *anywhere in Spain*', es: 'De Madrid a *cualquier lugar de España*' },
    intro: {
      en: [
        'A long-distance transfer starts at your door and ends at theirs. No station transfers at either end, no fixed departure times, no hauling suitcases across platforms — and you can work, call or sleep on the way.',
        'For two or more people travelling together, or anyone carrying luggage or samples, a private car is often closer to the train on price than people expect. Enter the two cities in the booking form to see the exact fare.',
      ],
      es: [
        'Un traslado de larga distancia empieza en su puerta y termina en la de destino. Sin traslados a la estación en ninguno de los extremos, sin horarios fijos de salida y sin arrastrar maletas por los andenes; además, puede trabajar, llamar o dormir por el camino.',
        'Para dos o más personas que viajan juntas, o para quien lleva equipaje o muestras, un coche privado suele acercarse al precio del tren más de lo que se piensa. Introduzca las dos ciudades en el formulario de reserva para ver la tarifa exacta.',
      ],
    },
    includes: {
      en: ['Door to door, on your timetable', 'Comfort stops whenever you want them', 'One price for the car, not per seat', 'Fixed fare including VAT, shown before you book'],
      es: ['De puerta a puerta, con su horario', 'Paradas de descanso cuando lo desee', 'Un precio por el coche, no por asiento', 'Tarifa cerrada con IVA incluido, visible antes de reservar'],
    },
    idealFor: {
      en: ['Business trips to Valencia, Zaragoza or Valladolid', 'Groups travelling with luggage', 'Destinations without a convenient train', 'Late returns after the last train has gone'],
      es: ['Viajes de negocios a Valencia, Zaragoza o Valladolid', 'Grupos que viajan con equipaje', 'Destinos sin un tren cómodo', 'Regresos tardíos cuando ya ha salido el último tren'],
    },
    vehicles: ['mercedes-e-class', 'mercedes-s-class', 'mercedes-v-class'],
    faqs: [
      {
        question: { en: 'How is the price calculated?', es: '¿Cómo se calcula el precio?' },
        answer: {
          en: 'From the road distance between your two addresses and the vehicle you choose. The booking form shows the full price before you confirm; nothing is added afterwards.',
          es: 'A partir de la distancia por carretera entre sus dos direcciones y del vehículo que elija. El formulario de reserva muestra el precio completo antes de confirmar; después no se añade nada.',
        },
      },
      {
        question: { en: 'Can we stop on the way?', es: '¿Podemos parar por el camino?' },
        answer: {
          en: 'Short comfort stops are part of any long journey. If you want a longer stop — lunch in a particular town, a visit on the way — mention it in the booking notes so we can plan the time.',
          es: 'Las paradas breves de descanso forman parte de cualquier viaje largo. Si desea una parada más larga —comer en un pueblo concreto o hacer una visita por el camino—, indíquelo en las notas de la reserva para que planifiquemos el tiempo.',
        },
      },
      {
        question: { en: 'How far will you go?', es: '¿Hasta dónde llegan?' },
        answer: {
          en: 'Anywhere in mainland Spain. Very long journeys, and trips into Portugal or France, are quoted individually — contact us.',
          es: 'A cualquier punto de la España peninsular. Los trayectos muy largos y los viajes a Portugal o Francia se presupuestan de forma individual: contacte con nosotros.',
        },
      },
    ],
  },
  {
    slug: 'day-trips',
    rideType: 'return',
    icon: 'map',
    title: { en: 'Day trips', es: 'Excursiones de un día' },
    summary: {
      en: 'Toledo, Segovia, Ávila or El Escorial with a car that waits for you — leave when you like, return when you are ready.',
      es: 'Toledo, Segovia, Ávila o El Escorial con un coche que le espera: salga cuando quiera y vuelva cuando esté listo.',
    },
    heading: { en: 'Out of Madrid *for the day*', es: 'Fuera de Madrid *por un día*' },
    intro: {
      en: [
        'Some of Spain’s most rewarding towns are an hour from Madrid. With a private car you set the pace: leave after breakfast, stop at the viewpoint the coaches skip, and stay for a long lunch without watching the clock for a train.',
        'Book a return with a pickup time for the way back, or hire the car by the hour and keep your chauffeur with you all day. Our route pages give honest distances, drive times and advice on when the train is the better idea.',
      ],
      es: [
        'Algunas de las ciudades más bonitas de España están a una hora de Madrid. Con un coche privado usted marca el ritmo: salga después de desayunar, pare en el mirador que los autocares se saltan y alargue la comida sin estar pendiente del horario del tren.',
        'Reserve ida y vuelta indicando la hora de regreso, o contrate el coche por horas y tenga a su chófer con usted todo el día. Nuestras páginas de rutas ofrecen distancias y tiempos reales, y un consejo sincero sobre cuándo conviene más el tren.',
      ],
    },
    includes: {
      en: ['Pickup from your hotel or home', 'A return time that suits your day', 'Stops at viewpoints and villages on the way', 'Fixed price for the car, including VAT'],
      es: ['Recogida en su hotel o domicilio', 'Una hora de regreso que se adapta a su día', 'Paradas en miradores y pueblos por el camino', 'Precio cerrado por el coche, con IVA incluido'],
    },
    idealFor: {
      en: ['Toledo and its famous viewpoint', 'Segovia’s aqueduct and Alcázar', 'Ávila’s medieval walls', 'El Escorial and the Guadarrama foothills'],
      es: ['Toledo y su famoso mirador', 'El acueducto y el Alcázar de Segovia', 'Las murallas medievales de Ávila', 'El Escorial y la sierra de Guadarrama'],
    },
    vehicles: ['mercedes-e-class', 'mercedes-v-class', 'mercedes-sprinter'],
    faqs: [
      {
        question: { en: 'Should I book a return or hourly hire?', es: '¿Reservo ida y vuelta o por horas?' },
        answer: {
          en: 'If you know roughly when you want to come back, a return is the simplest: one price for both journeys. If you want the car with you between stops — two towns in a day, or a winery visit — hourly hire is the better fit.',
          es: 'Si sabe más o menos cuándo quiere volver, la ida y vuelta es lo más sencillo: un precio por los dos trayectos. Si quiere tener el coche entre paradas —dos ciudades en un día o una visita a una bodega—, le conviene más el servicio por horas.',
        },
      },
      {
        question: { en: 'Is the chauffeur a tour guide?', es: '¿El chófer hace de guía turístico?' },
        answer: {
          en: 'No. Your chauffeur knows the roads, the drop-off points and the good viewpoints, but is not a licensed guide. We are happy to suggest how to book an official guide at your destination.',
          es: 'No. Su chófer conoce las carreteras, los puntos de parada y los mejores miradores, pero no es guía oficial. Con mucho gusto le orientamos sobre cómo reservar un guía oficial en su destino.',
        },
      },
      {
        question: { en: 'Can we visit two towns in one day?', es: '¿Podemos visitar dos ciudades en un día?' },
        answer: {
          en: 'Segovia and Ávila combine well, as do Toledo and Aranjuez. Three is too many to enjoy. Tell us your plan in the booking notes and we will check the timings.',
          es: 'Segovia y Ávila combinan bien, igual que Toledo y Aranjuez. Tres son demasiadas para disfrutarlas. Cuéntenos su plan en las notas de la reserva y revisaremos los tiempos.',
        },
      },
    ],
  },
]

export const serviceBySlug = (slug: string) => services.find((service) => service.slug === slug)
