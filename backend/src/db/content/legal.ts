import type { Localized } from './types.js'

export interface LegalSection {
  heading: string
  paragraphs?: string[]
  list?: string[]
}

export interface LegalDocument {
  slug: string
  title: Localized
  summary: Localized
  /** `YYYY-MM-DD` */
  updated: string
  sections: Localized<LegalSection[]>
}

/*
 * Placeholders: the website replaces them with the business details saved in the
 * console, so the documents stay correct when a phone number or address changes.
 */
const brand = '{brand}'
const site = { email: '{email}', phone: '{phone}' }
const { companyName, taxId, address, registry, licence } = {
  companyName: '{companyName}',
  taxId: '{taxId}',
  address: '{address}',
  registry: '{registry}',
  licence: '{licence}',
}

/**
 * TEMPLATES - these texts describe how this website actually works (what it
 * stores, which cookies it sets, how bookings are cancelled), but they are not
 * legal advice. Fill in the company details in the console and have the
 * documents reviewed by a qualified adviser before publishing.
 */
export const legalDocuments: LegalDocument[] = [
  {
    slug: 'terms',
    title: { en: 'Terms of use', es: 'Condiciones de uso' },
    summary: { en: 'The conditions that apply when you book and travel with us.', es: 'Las condiciones aplicables cuando reserva y viaja con nosotros.' },
    updated: '2026-10-12',
    sections: {
      en: [
        {
          heading: '1. Who we are',
          paragraphs: [`These terms govern the use of this website and the chauffeur services offered by ${companyName} ("${brand}", "we"), tax ID ${taxId}, with registered address at ${address}.`],
        },
        {
          heading: '2. Bookings',
          paragraphs: [
            'A booking request is made through the online form, by telephone or by WhatsApp. Online requests must be made at least 2 hours before the pickup time.',
            'Every request is reviewed by our team. The booking becomes binding once we confirm it; its status can be checked at any time on the tracking page with the booking reference and the email address used to book.',
          ],
        },
        {
          heading: '3. Prices and payment',
          paragraphs: [
            'The price shown before you confirm is fixed for the journey described and includes VAT. It is calculated from the route, the vehicle and, for hourly hire, the number of hours.',
            'Changes requested by the customer — a different address, additional stops, extra waiting or additional hours — may change the price. We will tell you the new price before the change is made.',
            'You may pay the chauffeur on the day, by card or in cash, or online where that option is offered. Online payments are processed by PayPal; we do not receive or store card details.',
          ],
        },
        {
          heading: '4. Changes and cancellations',
          list: [
            'You may cancel free of charge up to 24 hours before the pickup time, online or by contacting us.',
            'Bookings paid online and cancelled within that period are refunded in full to the original payment method.',
            'For changes, or cancellations at shorter notice, contact us; any charge that applies will be explained before you decide.',
            'If we are unable to provide a confirmed service, we will tell you as soon as possible and refund any amount paid.',
          ],
        },
        {
          heading: '5. On the day',
          paragraphs: [
            'Please be ready at the agreed place and time. For airport pickups, give us your flight number so the pickup can follow the actual arrival time.',
            'The number of passengers and items of luggage may not exceed the capacity of the vehicle booked. Children must travel in the restraint required by law; tell us their ages when you book.',
            'Smoking, and any behaviour that endangers the safety of the vehicle or its occupants, is not permitted. The chauffeur may refuse or end a service for these reasons.',
          ],
        },
        {
          heading: '6. Liability',
          paragraphs: [
            'We are responsible for providing the service with due care. We are not liable for delays caused by events outside our reasonable control, such as traffic incidents, weather, strikes or road closures, although we will always try to limit their effect.',
            'Nothing in these terms limits the rights you have as a consumer under applicable law.',
          ],
        },
        {
          heading: '7. Law and jurisdiction',
          paragraphs: ['These terms are governed by Spanish law. Consumers may bring proceedings before the courts of their place of residence.'],
        },
      ],
      es: [
        {
          heading: '1. Quiénes somos',
          paragraphs: [`Estas condiciones regulan el uso de este sitio web y los servicios de chófer ofrecidos por ${companyName} («${brand}», «nosotros»), con NIF ${taxId} y domicilio social en ${address}.`],
        },
        {
          heading: '2. Reservas',
          paragraphs: [
            'La solicitud de reserva se realiza mediante el formulario online, por teléfono o por WhatsApp. Las solicitudes online deben hacerse con al menos 2 horas de antelación respecto a la hora de recogida.',
            'Nuestro equipo revisa todas las solicitudes. La reserva es vinculante una vez que la confirmamos; su estado puede consultarse en cualquier momento en la página de seguimiento, con la referencia de la reserva y el email utilizado al reservar.',
          ],
        },
        {
          heading: '3. Precios y pago',
          paragraphs: [
            'El precio mostrado antes de confirmar es cerrado para el trayecto descrito e incluye el IVA. Se calcula a partir de la ruta, el vehículo y, en el servicio por horas, el número de horas.',
            'Los cambios solicitados por el cliente —otra dirección, paradas adicionales, esperas u horas adicionales— pueden modificar el precio. Le comunicaremos el nuevo precio antes de aplicar el cambio.',
            'Puede pagar al chófer el día del servicio, con tarjeta o en efectivo, o bien online cuando se ofrezca esa opción. Los pagos online los procesa PayPal; nosotros no recibimos ni almacenamos los datos de la tarjeta.',
          ],
        },
        {
          heading: '4. Modificaciones y cancelaciones',
          list: [
            'Puede cancelar sin coste hasta 24 horas antes de la hora de recogida, online o contactando con nosotros.',
            'Las reservas pagadas online y canceladas dentro de ese plazo se reembolsan íntegramente por el mismo medio de pago.',
            'Para modificaciones o cancelaciones con menos antelación, contacte con nosotros; le explicaremos cualquier cargo aplicable antes de que decida.',
            'Si no pudiéramos prestar un servicio confirmado, se lo comunicaremos lo antes posible y le reembolsaremos cualquier importe abonado.',
          ],
        },
        {
          heading: '5. El día del servicio',
          paragraphs: [
            'Le rogamos que esté preparado en el lugar y a la hora acordados. En las recogidas en aeropuerto, facilítenos su número de vuelo para ajustar la recogida a la hora real de llegada.',
            'El número de pasajeros y de bultos no puede superar la capacidad del vehículo reservado. Los menores deben viajar con el sistema de retención exigido por la ley; indíquenos sus edades al reservar.',
            'No está permitido fumar ni cualquier comportamiento que ponga en peligro la seguridad del vehículo o de sus ocupantes. El chófer puede rechazar o finalizar el servicio por estos motivos.',
          ],
        },
        {
          heading: '6. Responsabilidad',
          paragraphs: [
            'Somos responsables de prestar el servicio con la diligencia debida. No respondemos de los retrasos causados por hechos ajenos a nuestro control razonable, como incidencias de tráfico, meteorología, huelgas o cortes de carretera, aunque siempre trataremos de reducir sus efectos.',
            'Nada de lo dispuesto en estas condiciones limita los derechos que le corresponden como consumidor conforme a la legislación aplicable.',
          ],
        },
        {
          heading: '7. Legislación y jurisdicción',
          paragraphs: ['Estas condiciones se rigen por la legislación española. Los consumidores pueden acudir a los tribunales de su lugar de residencia.'],
        },
      ],
    },
  },
  {
    slug: 'privacy',
    title: { en: 'Privacy policy', es: 'Política de privacidad' },
    summary: { en: 'What personal data we collect, why, and the rights you have over it.', es: 'Qué datos personales recogemos, para qué y qué derechos tiene sobre ellos.' },
    updated: '2026-10-12',
    sections: {
      en: [
        {
          heading: '1. Data controller',
          paragraphs: [`${companyName}, tax ID ${taxId}, ${address}. Contact for privacy matters: ${site.email}.`],
        },
        {
          heading: '2. Data we collect',
          list: [
            'Bookings: name, email address, telephone number, pickup and drop-off locations, dates and times, number of passengers and suitcases, flight number, and any notes or company name you add.',
            'Accounts (optional): name, email address, telephone number and a password, which is stored only as an irreversible hash.',
            'Contact form: name, email address, telephone number (optional) and your message.',
            'Newsletter: your email address and language.',
            'Technical data needed to operate the site securely, such as your IP address in server logs.',
          ],
        },
        {
          heading: '3. Why we use it',
          list: [
            'To quote, arrange and provide the transport you request (performance of a contract).',
            'To answer your enquiries (your request, or our legitimate interest in replying).',
            'To send the newsletter, only if you subscribed (consent, which you can withdraw at any time).',
            'To meet legal obligations, such as tax and accounting records.',
          ],
        },
        {
          heading: '4. Who receives it',
          paragraphs: [
            'The chauffeur assigned to your ride receives the details needed to carry it out. Online payments are handled by PayPal under its own privacy policy; we never receive your card details.',
            'Text you type into the address fields is sent from our servers to an address-search service based on OpenStreetMap data in order to suggest locations. It is not combined with your personal details.',
            'We use service providers for hosting and email. We do not sell personal data.',
          ],
        },
        {
          heading: '5. How long we keep it',
          paragraphs: ['Booking and invoicing data are kept for the periods required by tax and commercial law. Account data are kept until you ask us to delete the account. Newsletter data are kept until you unsubscribe.'],
        },
        {
          heading: '6. Your rights',
          paragraphs: [
            `You may request access to your data, their correction or deletion, restriction of or objection to their processing, and their portability, by writing to ${site.email}.`,
            'You may also lodge a complaint with the Spanish Data Protection Agency (www.aepd.es).',
          ],
        },
      ],
      es: [
        {
          heading: '1. Responsable del tratamiento',
          paragraphs: [`${companyName}, NIF ${taxId}, ${address}. Contacto en materia de privacidad: ${site.email}.`],
        },
        {
          heading: '2. Datos que recogemos',
          list: [
            'Reservas: nombre, email, teléfono, lugares de recogida y destino, fechas y horas, número de pasajeros y maletas, número de vuelo y las notas o el nombre de empresa que usted añada.',
            'Cuentas (opcionales): nombre, email, teléfono y una contraseña, que se almacena únicamente como un hash irreversible.',
            'Formulario de contacto: nombre, email, teléfono (opcional) y su mensaje.',
            'Boletín: su email y su idioma.',
            'Datos técnicos necesarios para operar el sitio con seguridad, como su dirección IP en los registros del servidor.',
          ],
        },
        {
          heading: '3. Para qué los usamos',
          list: [
            'Para presupuestar, organizar y prestar el transporte que solicita (ejecución de un contrato).',
            'Para responder a sus consultas (su solicitud o nuestro interés legítimo en contestar).',
            'Para enviar el boletín, solo si se ha suscrito (consentimiento, que puede retirar en cualquier momento).',
            'Para cumplir obligaciones legales, como los registros fiscales y contables.',
          ],
        },
        {
          heading: '4. Quién los recibe',
          paragraphs: [
            'El chófer asignado a su trayecto recibe los datos necesarios para realizarlo. Los pagos online los gestiona PayPal conforme a su propia política de privacidad; nunca recibimos los datos de su tarjeta.',
            'El texto que escribe en los campos de dirección se envía desde nuestros servidores a un servicio de búsqueda de direcciones basado en datos de OpenStreetMap para sugerirle ubicaciones. No se combina con sus datos personales.',
            'Utilizamos proveedores de servicios de alojamiento y correo electrónico. No vendemos datos personales.',
          ],
        },
        {
          heading: '5. Cuánto tiempo los conservamos',
          paragraphs: ['Los datos de reservas y facturación se conservan durante los plazos exigidos por la normativa fiscal y mercantil. Los datos de la cuenta se conservan hasta que solicite su eliminación. Los datos del boletín, hasta que cancele la suscripción.'],
        },
        {
          heading: '6. Sus derechos',
          paragraphs: [
            `Puede solicitar el acceso a sus datos, su rectificación o supresión, la limitación u oposición a su tratamiento y su portabilidad escribiendo a ${site.email}.`,
            'También puede presentar una reclamación ante la Agencia Española de Protección de Datos (www.aepd.es).',
          ],
        },
      ],
    },
  },
  {
    slug: 'legal-notice',
    title: { en: 'Legal notice', es: 'Aviso legal' },
    summary: { en: 'Identification of the company that owns and operates this website.', es: 'Identificación de la empresa titular de este sitio web.' },
    updated: '2026-10-12',
    sections: {
      en: [
        {
          heading: 'Owner of the website',
          list: [`Company name: ${companyName}`, `Tax ID: ${taxId}`, `Registered address: ${address}`, `Registration: ${registry}`, `Transport licence: ${licence}`, `Email: ${site.email}`, `Telephone: ${site.phone}`],
        },
        {
          heading: 'Intellectual property',
          paragraphs: ['The texts, design and code of this website belong to the owner or are used under licence. They may not be reproduced without permission. Vehicle and event names are the property of their respective owners and are used for descriptive purposes only.'],
        },
        {
          heading: 'Use of the website',
          paragraphs: ['We work to keep the information on this site accurate and up to date, but distances, journey times and event dates are indicative and may change. The price that applies to a booking is the one shown at the time of confirmation.'],
        },
      ],
      es: [
        {
          heading: 'Titular del sitio web',
          list: [`Denominación social: ${companyName}`, `NIF: ${taxId}`, `Domicilio social: ${address}`, `Datos registrales: ${registry}`, `Autorización de transporte: ${licence}`, `Email: ${site.email}`, `Teléfono: ${site.phone}`],
        },
        {
          heading: 'Propiedad intelectual',
          paragraphs: ['Los textos, el diseño y el código de este sitio web pertenecen al titular o se utilizan bajo licencia. No pueden reproducirse sin autorización. Los nombres de vehículos y eventos pertenecen a sus respectivos titulares y se usan únicamente con fines descriptivos.'],
        },
        {
          heading: 'Uso del sitio web',
          paragraphs: ['Trabajamos para que la información de este sitio sea exacta y esté actualizada, pero las distancias, los tiempos de viaje y las fechas de los eventos son orientativos y pueden variar. El precio aplicable a una reserva es el mostrado en el momento de la confirmación.'],
        },
      ],
    },
  },
  {
    slug: 'cookies',
    title: { en: 'Cookie policy', es: 'Política de cookies' },
    summary: { en: 'The cookies and browser storage this website uses, and how to control them.', es: 'Las cookies y el almacenamiento del navegador que utiliza este sitio, y cómo controlarlos.' },
    updated: '2026-10-12',
    sections: {
      en: [
        {
          heading: 'What we use',
          paragraphs: ['This website uses only what it needs to work. No advertising cookies are used.'],
          list: [
            'sid — keeps you signed in to your account. Set only when you sign in or register. Lasts 30 days or until you sign out.',
            'locale — remembers the language you chose. Lasts one year.',
            'Booking in progress (browser storage) — saves the booking form on your device so you can come back to it. Removed when the booking is made.',
            'Cookie choice (browser storage) — remembers the choice you made in the cookie banner.',
          ],
        },
        {
          heading: 'Analytics',
          paragraphs: ['Analytics cookies are optional and are used only if you accept them. You can change your choice at any time with the "Cookie settings" link at the bottom of every page.'],
        },
        {
          heading: 'Payments',
          paragraphs: ['If you choose to pay online you are taken to PayPal, which sets its own cookies on its own pages under its own policy.'],
        },
        {
          heading: 'Controlling cookies in your browser',
          paragraphs: ['You can delete or block cookies in your browser settings. If you block the necessary ones, signing in will not work, although you can still book as a guest.'],
        },
      ],
      es: [
        {
          heading: 'Qué utilizamos',
          paragraphs: ['Este sitio web utiliza únicamente lo necesario para funcionar. No se usan cookies publicitarias.'],
          list: [
            'sid: mantiene abierta la sesión de su cuenta. Solo se crea al iniciar sesión o registrarse. Dura 30 días o hasta que cierre sesión.',
            'locale: recuerda el idioma que ha elegido. Dura un año.',
            'Reserva en curso (almacenamiento del navegador): guarda el formulario de reserva en su dispositivo para que pueda retomarlo. Se elimina al realizar la reserva.',
            'Preferencia de cookies (almacenamiento del navegador): recuerda la opción que eligió en el aviso de cookies.',
          ],
        },
        {
          heading: 'Analítica',
          paragraphs: ['Las cookies de analítica son opcionales y solo se utilizan si las acepta. Puede cambiar su elección en cualquier momento con el enlace «Configurar cookies» al pie de cada página.'],
        },
        {
          heading: 'Pagos',
          paragraphs: ['Si elige pagar online, se le dirige a PayPal, que instala sus propias cookies en sus propias páginas conforme a su política.'],
        },
        {
          heading: 'Control de cookies en su navegador',
          paragraphs: ['Puede eliminar o bloquear las cookies en la configuración de su navegador. Si bloquea las necesarias, no podrá iniciar sesión, aunque sí reservar como invitado.'],
        },
      ],
    },
  },
  {
    slug: 'accessibility',
    title: { en: 'Accessibility', es: 'Accesibilidad' },
    summary: { en: 'Our commitment to a website, and a service, that everyone can use.', es: 'Nuestro compromiso con un sitio web y un servicio que todo el mundo pueda utilizar.' },
    updated: '2026-10-12',
    sections: {
      en: [
        {
          heading: 'Our aim',
          paragraphs: ['We want everyone to be able to book and travel with us. We aim for this website to meet the Web Content Accessibility Guidelines (WCAG) 2.1 at level AA.'],
        },
        {
          heading: 'What we have done',
          list: [
            'Every page can be used with a keyboard, with a visible focus indicator and a link to skip to the main content.',
            'Forms have labels, and errors are announced and described in text, not by colour alone.',
            'Text meets contrast requirements and can be enlarged without loss of content.',
            'Animations are reduced for people who ask their device to limit motion.',
            'The site is available in English and Spanish, with the language declared for screen readers.',
          ],
        },
        {
          heading: 'Travelling with us',
          paragraphs: ['If you use a wheelchair, travel with an assistance dog or need extra time or help, tell us in the booking notes or call us and we will arrange the right vehicle and assistance.'],
        },
        {
          heading: 'Tell us about a problem',
          paragraphs: [`If any part of this website is difficult for you to use, write to ${site.email} or call ${site.phone}. We will help you book by another means and work to fix the problem.`],
        },
      ],
      es: [
        {
          heading: 'Nuestro objetivo',
          paragraphs: ['Queremos que cualquier persona pueda reservar y viajar con nosotros. Aspiramos a que este sitio web cumpla las Pautas de Accesibilidad para el Contenido Web (WCAG) 2.1 en su nivel AA.'],
        },
        {
          heading: 'Qué hemos hecho',
          list: [
            'Todas las páginas pueden utilizarse con el teclado, con un indicador de foco visible y un enlace para saltar al contenido principal.',
            'Los formularios tienen etiquetas, y los errores se anuncian y se describen con texto, no solo con color.',
            'El texto cumple los requisitos de contraste y puede ampliarse sin pérdida de contenido.',
            'Las animaciones se reducen para quienes piden a su dispositivo que limite el movimiento.',
            'El sitio está disponible en inglés y en español, con el idioma declarado para los lectores de pantalla.',
          ],
        },
        {
          heading: 'Viajar con nosotros',
          paragraphs: ['Si utiliza silla de ruedas, viaja con un perro de asistencia o necesita más tiempo o ayuda, indíquelo en las notas de la reserva o llámenos y organizaremos el vehículo y la asistencia adecuados.'],
        },
        {
          heading: 'Comuníquenos un problema',
          paragraphs: [`Si alguna parte de este sitio web le resulta difícil de usar, escriba a ${site.email} o llame al ${site.phone}. Le ayudaremos a reservar por otro medio y trabajaremos para solucionar el problema.`],
        },
      ],
    },
  },
]
