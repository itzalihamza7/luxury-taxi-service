import type { Localized } from './types.js'

export interface Faq {
  /** Address of the entry; the first ten are numbered (`faq-1`...), later ones are named. */
  slug?: string
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
      en: 'Nothing is charged when you book. We check your ride, then send you a secure payment link, by email and WhatsApp, for an advance or the full amount. You pay on our payment provider’s secure page, and we never see or store your card details. Your booking is confirmed as soon as the payment arrives. A ride whose price is agreed with you, such as hourly hire of the minibus, is paid the same way once the price is set.',
      es: 'Al reservar no se cobra nada. Revisamos su trayecto y después le enviamos un enlace de pago seguro, por correo y WhatsApp, para un anticipo o el importe total. Paga en la página segura de nuestro proveedor de pagos, y nunca vemos ni almacenamos los datos de su tarjeta. Su reserva queda confirmada en cuanto llega el pago. Un servicio cuyo precio se acuerda con usted, como el minibús por horas, se paga igual una vez fijado el precio.',
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
  // The questions travellers ask most about Madrid transfers (added 27 October 2026, migration 0014).
  {
    slug: 'airport-taxi-or-chauffeur',
    question: { en: 'Is a chauffeur worth it compared with a Madrid airport taxi?', es: '¿Compensa un chófer frente al taxi del aeropuerto de Madrid?' },
    answer: {
      en: 'It depends on the trip. Madrid taxis charge a flat €33 between the airport and any address inside the M-30 ring, so for one or two people travelling light a taxi is usually the cheaper choice. A chauffeur is booked in advance and waits for you in arrivals with a name board, follows your flight, helps with the luggage and comes in a vehicle sized for your group — up to seven people in a van or sixteen in the minibus. Every vehicle’s price is fixed and shown before you book, including for addresses outside the M-30, where taxis run on the meter.',
      es: 'Depende del viaje. Los taxis de Madrid cobran una tarifa fija de 33 € entre el aeropuerto y cualquier dirección dentro de la M-30, así que para una o dos personas con poco equipaje el taxi suele ser la opción más barata. Un chófer está reservado de antemano y le espera en la sala de llegadas con un cartel con su nombre, sigue su vuelo, le ayuda con el equipaje y llega en un vehículo adecuado a su grupo: hasta siete personas en un monovolumen o dieciséis en el minibús. El precio de cada vehículo es cerrado y se muestra antes de reservar, también para direcciones fuera de la M-30, donde el taxi funciona con taxímetro.',
    },
  },
  {
    slug: 'airport-meeting-point',
    question: { en: 'Where will my chauffeur meet me at Madrid–Barajas?', es: '¿Dónde me espera el chófer en Madrid–Barajas?' },
    answer: {
      en: 'In the arrivals hall of your terminal, just past customs, holding a board with your name. We serve every terminal: T1, T2, T3, T4 and the T4S satellite. If you land at T4S, an automatic train takes you to the main T4 building, and that is where you come out. If you cannot find each other, call or WhatsApp us and we will connect you straight away.',
      es: 'En la sala de llegadas de su terminal, justo después de la aduana, con un cartel con su nombre. Atendemos todas las terminales: T1, T2, T3, T4 y el satélite T4S. Si aterriza en la T4S, un tren automático le lleva al edificio principal de la T4, y es allí donde sale. Si no se encuentran, llámenos o escríbanos por WhatsApp y les pondremos en contacto de inmediato.',
    },
  },
  {
    slug: 'extra-charges',
    question: { en: 'Are there any extra charges on top of the price?', es: '¿Hay cargos adicionales sobre el precio?' },
    answer: {
      en: 'No hidden ones. The price shown before you book is fixed for the journey you describe and includes VAT. It changes only if you ask for something different — another address, extra stops, extra waiting or more hours — and we tell you the new price before the change is made.',
      es: 'Ninguno oculto. El precio que ve antes de reservar es cerrado para el trayecto que indica e incluye el IVA. Solo cambia si usted pide algo distinto —otra dirección, paradas adicionales, esperas u horas adicionales— y le comunicamos el nuevo precio antes de hacer el cambio.',
    },
  },
  {
    slug: 'chauffeur-languages',
    question: { en: 'Do your chauffeurs speak English?', es: '¿Sus chóferes hablan inglés?' },
    answer: {
      en: 'Yes. Our chauffeurs speak English and Spanish, so directions, changes of plan and the pickup itself are easy whichever language you prefer. You can also write to us in either language by email or WhatsApp.',
      es: 'Sí. Nuestros chóferes hablan inglés y español, así que las indicaciones, los cambios de plan y la propia recogida resultan sencillos en el idioma que prefiera. También puede escribirnos en cualquiera de los dos idiomas por correo o WhatsApp.',
    },
  },
]
