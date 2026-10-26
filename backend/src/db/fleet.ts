import type { vehicles } from './schema.js'

type NewVehicle = typeof vehicles.$inferInsert

/**
 * Starting fleet, inserted once when the `vehicles` table is empty.
 *
 * Rates in euro cents, from the business's price list of 26 October 2026: the fixed price inside
 * the M-30 (see `lib/zone.ts`), the price per km beyond it, and the hourly rate (null: on request).
 * After the first start the database is the source of truth: vehicles, prices
 * and photos are then edited in the console (`/admin`), not here.
 *
 * The photos are in `frontend/public/images/fleet/` (sources and licences in
 * `frontend/public/images/CREDITS.md`).
 */
export const INITIAL_FLEET: NewVehicle[] = [
  {
    slug: 'mercedes-e-class',
    imageUrl: '/images/fleet/mercedes-e-class.jpg',
    name: 'Mercedes-Benz E-Class',
    category: 'sedan',
    bodyType: 'sedan',
    passengers: 3,
    luggage: 2,
    zoneFareCents: 9000,
    perKmCents: 230,
    hourlyRateCents: 8500,
    tagline: { en: 'Business sedan', es: 'Berlina ejecutiva' },
    description: {
      en: 'Our most-booked car. Quiet, composed and comfortable for up to three passengers with luggage — the natural choice for airport transfers, meetings and dinners across Madrid.',
      es: 'Nuestro coche más solicitado. Silencioso, cómodo y con espacio para tres pasajeros con equipaje: la opción natural para traslados al aeropuerto, reuniones y cenas en Madrid.',
    },
    highlights: {
      en: ['Leather seats and air conditioning', 'Phone chargers and Wi-Fi on board', 'Best value for one to three travellers'],
      es: ['Asientos de piel y aire acondicionado', 'Cargadores y wifi a bordo', 'La mejor relación calidad-precio para uno a tres viajeros'],
    },
    sortOrder: 10,
  },
  {
    slug: 'mercedes-s-class',
    imageUrl: '/images/fleet/mercedes-s-class.jpg',
    name: 'Mercedes-Benz S-Class',
    category: 'sedan',
    bodyType: 'limousine',
    passengers: 3,
    luggage: 2,
    zoneFareCents: 15000,
    perKmCents: 350,
    hourlyRateCents: 12000,
    tagline: { en: 'First-class sedan', es: 'Berlina de primera clase' },
    description: {
      en: 'The long-wheelbase saloon: more legroom, softer suspension and a noticeably quieter cabin. Chosen by executives, for special occasions and for long motorway journeys.',
      es: 'La berlina de batalla larga: más espacio para las piernas, una suspensión más suave y un habitáculo claramente más silencioso. La eligen directivos, ocasiones especiales y viajes largos por autovía.',
    },
    highlights: {
      en: ['Extended rear legroom', 'Exceptionally quiet on long journeys', 'A fitting arrival for clients and guests'],
      es: ['Mayor espacio para las piernas en la parte trasera', 'Especialmente silencioso en viajes largos', 'Una llegada a la altura de clientes e invitados'],
    },
    sortOrder: 20,
  },
  {
    slug: 'mercedes-v-class',
    imageUrl: '/images/fleet/mercedes-v-class.jpg',
    name: 'Mercedes-Benz V-Class',
    category: 'van',
    bodyType: 'van',
    passengers: 7,
    luggage: 5,
    zoneFareCents: 9000,
    perKmCents: 300,
    hourlyRateCents: 9500,
    tagline: { en: 'First-class van', es: 'Monovolumen de primera clase' },
    description: {
      en: "Seven seats, a generous boot and easy step-in access. Families, small groups and anyone travelling with golf bags, pushchairs or a week's luggage ride together in one vehicle.",
      es: 'Siete plazas, un maletero amplio y acceso cómodo. Familias, grupos pequeños y cualquiera que viaje con bolsas de golf, carritos o equipaje para una semana pueden ir juntos en un solo vehículo.',
    },
    highlights: {
      en: ['One vehicle instead of two taxis', 'Sliding doors and easy step-in access', 'Space for pushchairs, skis or golf bags'],
      es: ['Un solo vehículo en lugar de dos taxis', 'Puertas correderas y acceso cómodo', 'Espacio para carritos, esquís o bolsas de golf'],
    },
    sortOrder: 30,
  },
  {
    slug: 'mercedes-maybach',
    imageUrl: '/images/fleet/mercedes-maybach.jpg',
    name: 'Mercedes-Maybach S-Class',
    category: 'flagship',
    bodyType: 'limousine',
    passengers: 3,
    luggage: 2,
    zoneFareCents: 30000,
    perKmCents: 600,
    hourlyRateCents: 22000,
    tagline: { en: 'Flagship', es: 'Buque insignia' },
    description: {
      en: "The most refined car in the fleet. Individual reclining rear seats, exceptional quiet and a ride that makes Madrid's traffic feel a long way off. For the journeys that should feel like an occasion.",
      es: 'El coche más refinado de la flota. Asientos traseros individuales reclinables, un silencio excepcional y una marcha que hace olvidar el tráfico de Madrid. Para los trayectos que merecen sentirse como una ocasión.',
    },
    highlights: {
      en: ['Reclining individual rear seats', 'The quietest cabin in the fleet', 'Weddings, VIP guests and milestone occasions'],
      es: ['Asientos traseros individuales reclinables', 'El habitáculo más silencioso de la flota', 'Bodas, invitados VIP y ocasiones señaladas'],
    },
    sortOrder: 40,
  },
  {
    slug: 'v-class-vip',
    imageUrl: '/images/fleet/v-class-vip.jpg',
    name: 'Mercedes-Benz V-Class VIP',
    category: 'flagship',
    bodyType: 'van',
    passengers: 6,
    luggage: 5,
    zoneFareCents: 16000,
    perKmCents: 390,
    hourlyRateCents: 15000,
    tagline: { en: 'Flagship van', es: 'Monovolumen insignia' },
    description: {
      en: 'A V-Class rebuilt around its passengers: fewer seats, far more space and a lounge-style cabin for up to six. A private room on wheels for roadshows, wedding parties and VIP groups.',
      es: 'Un Clase V repensado en torno a sus pasajeros: menos asientos, mucho más espacio y un habitáculo tipo salón para hasta seis personas. Una sala privada sobre ruedas para roadshows, cortejos nupciales y grupos VIP.',
    },
    highlights: {
      en: ['Lounge-style seating for up to six', 'Privacy for calls and conversations on the move', 'Flagship comfort with room for luggage'],
      es: ['Asientos tipo salón para hasta seis personas', 'Privacidad para llamadas y conversaciones en marcha', 'Confort de gama alta con espacio para equipaje'],
    },
    // Not on the price list of 26 October 2026: kept for older bookings, hidden from the website.
    active: false,
    sortOrder: 50,
  },
  {
    slug: 'mercedes-sprinter',
    imageUrl: '/images/fleet/mercedes-sprinter.jpg',
    name: 'Mercedes-Benz Sprinter',
    category: 'group',
    bodyType: 'minibus',
    passengers: 16,
    luggage: 16,
    zoneFareCents: 30000,
    perKmCents: 500,
    hourlyRateCents: null,
    tagline: { en: 'Minibus', es: 'Minibús' },
    description: {
      en: 'Sixteen seats with luggage space to match. Keeps a team, a wedding party or a tour group on one schedule — one pickup, one arrival, one price.',
      es: 'Dieciséis plazas con espacio para el equipaje de todos. Mantiene a un equipo, a los invitados de una boda o a un grupo turístico en el mismo horario: una recogida, una llegada, un precio.',
    },
    highlights: {
      en: ['Up to sixteen passengers together', 'One fixed price for the whole group', 'Events, congresses and day trips'],
      es: ['Hasta dieciséis pasajeros juntos', 'Un precio cerrado para todo el grupo', 'Eventos, congresos y excursiones de un día'],
    },
    sortOrder: 60,
  },
  {
    slug: 'toyota-yaris',
    imageUrl: '/images/fleet/toyota-yaris.jpg',
    name: 'Toyota Yaris',
    category: 'economy',
    bodyType: 'hatchback',
    passengers: 3,
    luggage: 2,
    zoneFareCents: 4000,
    perKmCents: 135,
    hourlyRateCents: 4500,
    tagline: { en: 'Economy', es: 'Económico' },
    description: {
      en: 'A compact city car for short hops when you want a professional driver and a fixed price without the executive saloon. Same chauffeur standards, smaller footprint.',
      es: 'Un utilitario compacto para trayectos cortos, cuando quiere un conductor profesional y un precio cerrado sin necesidad de una berlina ejecutiva. Los mismos estándares de servicio en un formato más pequeño.',
    },
    highlights: {
      en: ['Our lowest fixed fares', 'Easy through narrow city-centre streets', 'Best for one or two travellers with light luggage'],
      es: ['Nuestras tarifas cerradas más bajas', 'Ágil por las calles estrechas del centro', 'Ideal para uno o dos viajeros con poco equipaje'],
    },
    // Not on the price list of 26 October 2026: kept for older bookings, hidden from the website.
    active: false,
    sortOrder: 70,
  },
  {
    slug: 'toyota-corolla',
    imageUrl: null,
    name: 'Toyota Corolla',
    category: 'economy',
    bodyType: 'sedan',
    passengers: 4,
    luggage: 3,
    zoneFareCents: 7000,
    perKmCents: 130,
    hourlyRateCents: 5000,
    tagline: { en: 'Hybrid saloon', es: 'Berlina híbrida' },
    description: {
      en: 'A quiet, efficient hybrid saloon for everyday transfers: room for four, a proper boot for luggage, and the same professional chauffeur and fixed price as the rest of the fleet.',
      es: 'Una berlina híbrida silenciosa y eficiente para los traslados de cada día: sitio para cuatro, un maletero de verdad para el equipaje y el mismo chófer profesional y precio cerrado que el resto de la flota.',
    },
    highlights: {
      en: ['Our lowest fixed fares', 'Quiet hybrid engine', 'Room for four with their luggage'],
      es: ['Nuestras tarifas cerradas más bajas', 'Motor híbrido silencioso', 'Sitio para cuatro con su equipaje'],
    },
    sortOrder: 70,
  },
]
