/** Copy for the home page: the scroll-driven drive, services, the car, booking and the footer. */
const en = {
  metaTitle: 'SignatureMile — Private Chauffeur in Madrid',
  metaDescription:
    'A black Mercedes-Maybach S-Class and a suited, bilingual chauffeur. Airport transfers, business days and evenings across Madrid at a fixed price, quoted in advance.',
  loading: 'Loading',
  nav: {
    label: 'Main navigation',
    links: { services: 'Services', car: 'The car', booking: 'Booking', contact: 'Contact' },
    book: 'Book now',
    menu: 'Open the menu',
    close: 'Close the menu',
    language: 'Language',
  },
  drive: {
    label: 'The drive',
    arrival: { eyebrow: 'Private chauffeur — Madrid', lines: ['Madrid,', 'by Maybach.'] },
    scroll: 'Scroll to step inside',
    approach: {
      eyebrow: 'The standard',
      lines: ['Discretion,', 'as standard.'],
      points: ['Professional, bilingual chauffeurs', 'Fixed price, quoted in advance', 'Available 24 hours, 7 days a week'],
    },
    inside: {
      eyebrow: 'Your seat is ready',
      title: 'Step inside.',
      text: 'Airport transfers, business days and unforgettable evenings across Madrid, by the hour or by the journey.',
      book: 'Book a ride',
      whatsapp: 'WhatsApp',
    },
  },
  services: {
    eyebrow: 'Services',
    lines: ['Every journey,', 'handled.'],
    lead: 'One car, one chauffeur, one standard, whether you land at Barajas at 6am or leave the Teatro Real at midnight.',
    items: [
      { title: 'Airport transfers', text: 'Madrid–Barajas pick-ups with flight tracking and meet & greet in arrivals.' },
      { title: 'Business & roadshows', text: 'Hourly hire for meetings across the city. A quiet office on wheels.' },
      { title: 'Events & evenings', text: 'Weddings, galas, dinners and nights at the opera. Dropped at the door, collected on time.' },
      { title: 'Day trips', text: 'Toledo, Segovia, Ávila or El Escorial in comfort, with your chauffeur waiting while you explore.' },
    ],
  },
  car: {
    eyebrow: 'The car',
    lines: ['Mercedes-Maybach', 'S-Class.'],
    text: 'Reclining rear seats, quilted leather, near-silent cabin. The most comfortable place in Madrid to take a call, or to take nothing at all.',
    imageAlt: 'The cream leather rear seats of the Mercedes-Maybach S-Class',
    specs: [
      { label: 'Passengers', value: 'Up to 3' },
      { label: 'Luggage', value: '2 large suitcases' },
      { label: 'On board', value: 'Water, Wi-Fi, chargers' },
      { label: 'Chauffeur', value: 'Suited, bilingual' },
    ],
  },
  booking: {
    eyebrow: 'Reservations',
    lines: ['Your car,', 'on time.'],
    text: 'Tell us where and when. We confirm availability and a fixed price on WhatsApp within minutes.',
    city: 'Madrid, España',
    fields: {
      pickup: 'Pick-up',
      dropoff: 'Drop-off',
      date: 'Date',
      time: 'Time',
      service: 'Service',
      passengers: 'Passengers',
      name: 'Name',
      phone: 'Phone',
      notes: 'Notes',
    },
    services: ['Airport transfer', 'Hourly hire', 'Event', 'Day trip'],
    submit: 'Request via WhatsApp →',
    note: "No payment now. You'll receive a fixed quote before anything is confirmed.",
    /** The first line of the message sent on WhatsApp. */
    message: 'Booking request',
  },
  footer: {
    rights: '© {year} SignatureMile. Private chauffeur service, Madrid.',
    instagram: 'Instagram',
    whatsapp: 'WhatsApp',
    more: 'More',
    links: { fleet: 'Fleet', online: 'Book online', track: 'Track a booking', account: 'My account' },
    legal: { notice: 'Legal notice', privacy: 'Privacy', cookies: 'Cookies', terms: 'Terms' },
  },
}

const es: typeof en = {
  metaTitle: 'SignatureMile — Chófer privado en Madrid',
  metaDescription:
    'Un Mercedes-Maybach Clase S negro y un chófer bilingüe, de traje. Traslados al aeropuerto, jornadas de trabajo y noches en Madrid a precio cerrado, presupuestado de antemano.',
  loading: 'Cargando',
  nav: {
    label: 'Navegación principal',
    links: { services: 'Servicios', car: 'El coche', booking: 'Reservas', contact: 'Contacto' },
    book: 'Reservar',
    menu: 'Abrir el menú',
    close: 'Cerrar el menú',
    language: 'Idioma',
  },
  drive: {
    label: 'El trayecto',
    arrival: { eyebrow: 'Chófer privado — Madrid', lines: ['Madrid,', 'en Maybach.'] },
    scroll: 'Desplácese para subir',
    approach: {
      eyebrow: 'El estándar',
      lines: ['Discreción,', 'de serie.'],
      points: ['Chóferes profesionales y bilingües', 'Precio cerrado, presupuestado de antemano', 'Disponibles las 24 horas, 7 días a la semana'],
    },
    inside: {
      eyebrow: 'Su asiento le espera',
      title: 'Adelante.',
      text: 'Traslados al aeropuerto, jornadas de trabajo y noches inolvidables en Madrid, por horas o por trayecto.',
      book: 'Reservar',
      whatsapp: 'WhatsApp',
    },
  },
  services: {
    eyebrow: 'Servicios',
    lines: ['Cada trayecto,', 'resuelto.'],
    lead: 'Un coche, un chófer, un mismo estándar, tanto si aterriza en Barajas a las 6 de la mañana como si sale del Teatro Real a medianoche.',
    items: [
      { title: 'Traslados al aeropuerto', text: 'Recogidas en Madrid-Barajas con seguimiento del vuelo y bienvenida en llegadas.' },
      { title: 'Negocios y roadshows', text: 'Servicio por horas para reuniones por toda la ciudad. Una oficina silenciosa sobre ruedas.' },
      { title: 'Eventos y noches', text: 'Bodas, galas, cenas y noches de ópera. Le dejamos en la puerta y le recogemos a su hora.' },
      { title: 'Excursiones', text: 'Toledo, Segovia, Ávila o El Escorial con toda comodidad, con su chófer esperando mientras usted visita.' },
    ],
  },
  car: {
    eyebrow: 'El coche',
    lines: ['Mercedes-Maybach', 'Clase S.'],
    text: 'Asientos traseros reclinables, cuero acolchado, un habitáculo casi silencioso. El lugar más cómodo de Madrid para atender una llamada, o para no hacer nada en absoluto.',
    imageAlt: 'Los asientos traseros de cuero crema del Mercedes-Maybach Clase S',
    specs: [
      { label: 'Pasajeros', value: 'Hasta 3' },
      { label: 'Equipaje', value: '2 maletas grandes' },
      { label: 'A bordo', value: 'Agua, wifi, cargadores' },
      { label: 'Chófer', value: 'De traje, bilingüe' },
    ],
  },
  booking: {
    eyebrow: 'Reservas',
    lines: ['Su coche,', 'a su hora.'],
    text: 'Díganos dónde y cuándo. Le confirmamos disponibilidad y un precio cerrado por WhatsApp en pocos minutos.',
    city: 'Madrid, España',
    fields: {
      pickup: 'Recogida',
      dropoff: 'Destino',
      date: 'Fecha',
      time: 'Hora',
      service: 'Servicio',
      passengers: 'Pasajeros',
      name: 'Nombre',
      phone: 'Teléfono',
      notes: 'Notas',
    },
    services: ['Traslado al aeropuerto', 'Por horas', 'Evento', 'Excursión'],
    submit: 'Solicitar por WhatsApp →',
    note: 'No se paga nada ahora. Recibirá un precio cerrado antes de confirmar nada.',
    message: 'Solicitud de reserva',
  },
  footer: {
    rights: '© {year} SignatureMile. Servicio de chófer privado, Madrid.',
    instagram: 'Instagram',
    whatsapp: 'WhatsApp',
    more: 'Más',
    links: { fleet: 'Flota', online: 'Reservar online', track: 'Seguir una reserva', account: 'Mi cuenta' },
    legal: { notice: 'Aviso legal', privacy: 'Privacidad', cookies: 'Cookies', terms: 'Condiciones' },
  },
}

export const landing = { en, es }
export type LandingMessages = typeof en
