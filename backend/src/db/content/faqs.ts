import type { Localized } from './types.js'

export interface Faq {
  question: Localized
  answer: Localized
  /** Shown on the home page as well as the FAQ page. */
  featured?: boolean
}

export const faqs: Faq[] = [
  {
    featured: true,
    question: { en: 'How do I book a chauffeur?', es: '¿Cómo reservo un chófer?' },
    answer: {
      en: 'Use the booking form: choose the type of ride, enter pickup and drop-off, pick a date and time, and you will see the price for every vehicle before you confirm. It takes about two minutes. You can also call or WhatsApp us at any hour and we will book it for you.',
      es: 'Con el formulario de reserva: elija el tipo de trayecto, indique recogida y destino, seleccione fecha y hora, y verá el precio de cada vehículo antes de confirmar. Se tarda unos dos minutos. También puede llamarnos o escribirnos por WhatsApp a cualquier hora y lo reservamos por usted.',
    },
  },
  {
    featured: true,
    question: { en: 'Is the price really fixed?', es: '¿De verdad el precio es cerrado?' },
    answer: {
      en: 'Yes. The price is calculated from your route and the vehicle you choose, and it is shown before you book. It includes VAT. It only changes if you change the journey — a different address, extra stops or more hours.',
      es: 'Sí. El precio se calcula según su ruta y el vehículo que elija, y se muestra antes de reservar. Incluye el IVA. Solo cambia si usted cambia el trayecto: otra dirección, paradas adicionales o más horas.',
    },
  },
  {
    featured: true,
    question: { en: 'How far in advance do I need to book?', es: '¿Con cuánta antelación debo reservar?' },
    answer: {
      en: 'Online booking is open until two hours before pickup. For early-morning rides, larger vehicles and busy dates such as trade fairs, book a day or more ahead. If you need a car sooner, call or WhatsApp us and we will tell you straight away whether we can do it.',
      es: 'La reserva online está abierta hasta dos horas antes de la recogida. Para trayectos de madrugada, vehículos grandes y fechas de mucha demanda, como las ferias, reserve con un día o más de antelación. Si necesita un coche antes, llámenos o escríbanos por WhatsApp y le diremos enseguida si es posible.',
    },
  },
  {
    featured: true,
    question: { en: 'Can I change or cancel my booking?', es: '¿Puedo modificar o cancelar mi reserva?' },
    answer: {
      en: 'You can cancel free of charge up to 24 hours before pickup, online, from your account or the tracking page. To change a time, address or vehicle, or to cancel at shorter notice, contact us and we will do our best to help.',
      es: 'Puede cancelar sin coste hasta 24 horas antes de la recogida, online, desde su cuenta o desde la página de seguimiento. Para cambiar la hora, la dirección o el vehículo, o para cancelar con menos antelación, contacte con nosotros y haremos todo lo posible por ayudarle.',
    },
  },
  {
    question: { en: 'How can I pay?', es: '¿Cómo puedo pagar?' },
    answer: {
      en: 'You can pay your chauffeur on the day, by card or in cash. Where online payment is offered at checkout, it is handled on PayPal’s secure page — with a card or a PayPal account — and we never see or store your card details.',
      es: 'Puede pagar a su chófer el mismo día, con tarjeta o en efectivo. Cuando se ofrece pago online al finalizar la reserva, se realiza en la página segura de PayPal —con tarjeta o con cuenta PayPal— y nunca vemos ni almacenamos los datos de su tarjeta.',
    },
  },
  {
    question: { en: 'Do I need an account?', es: '¿Necesito una cuenta?' },
    answer: {
      en: 'No. You can book as a guest with just your name, email and phone number, and follow your booking with the reference we give you. An account is optional: it keeps your details for next time and shows all your bookings in one place.',
      es: 'No. Puede reservar como invitado solo con su nombre, email y teléfono, y seguir su reserva con la referencia que le facilitamos. La cuenta es opcional: guarda sus datos para la próxima vez y reúne todas sus reservas en un mismo lugar.',
    },
  },
  {
    question: { en: 'What happens if my flight is delayed?', es: '¿Qué ocurre si mi vuelo se retrasa?' },
    answer: {
      en: 'Add your flight number when you book an airport pickup. We follow the flight and adjust the pickup to the real landing time, so your chauffeur is there when you come out.',
      es: 'Indique su número de vuelo al reservar una recogida en el aeropuerto. Seguimos el vuelo y ajustamos la recogida a la hora real de aterrizaje, para que su chófer esté allí cuando usted salga.',
    },
  },
  {
    question: { en: 'Which vehicle should I choose?', es: '¿Qué vehículo debo elegir?' },
    answer: {
      en: 'Go by passengers and luggage. A sedan carries up to three people with two large suitcases; a van up to seven with five; the minibus up to sixteen. The booking form only lets you choose vehicles that fit the group you entered. If you are between sizes, choose the larger one.',
      es: 'Guíese por los pasajeros y el equipaje. Una berlina lleva hasta tres personas con dos maletas grandes; un monovolumen, hasta siete con cinco; el minibús, hasta dieciséis. El formulario solo le permite elegir vehículos adecuados para el grupo indicado. Si está entre dos tamaños, elija el mayor.',
    },
  },
  {
    question: { en: 'Do you provide child seats?', es: '¿Disponen de sillas infantiles?' },
    answer: {
      en: 'Tell us the ages of the children in the booking notes and we will confirm the right seats for your ride. Remember that each child seat takes a full place in the vehicle.',
      es: 'Indique las edades de los niños en las notas de la reserva y le confirmaremos las sillas adecuadas para su trayecto. Recuerde que cada silla infantil ocupa una plaza completa del vehículo.',
    },
  },
  {
    question: { en: 'Where do you operate?', es: '¿Dónde prestan servicio?' },
    answer: {
      en: 'We are based in Madrid and work across the city and region every day, with long-distance transfers to anywhere in mainland Spain. For journeys abroad or several days on the road, contact us for a tailored quote.',
      es: 'Tenemos sede en Madrid y trabajamos a diario en la ciudad y en toda la Comunidad, con traslados de larga distancia a cualquier punto de la España peninsular. Para viajes al extranjero o de varios días, contacte con nosotros y le prepararemos un presupuesto a medida.',
    },
  },
]
