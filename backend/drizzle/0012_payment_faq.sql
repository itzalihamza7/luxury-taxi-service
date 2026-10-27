-- "How can I pay?" follows the payment links of 26 October 2026: nothing is charged at booking, the team
-- sends a link for an advance or the full amount, and the booking is confirmed once it is paid. Only
-- the starting answer is replaced: an answer the team has already edited in the console stays.
UPDATE "content_entries"
SET "data" = jsonb_set(
      "data",
      '{answer}',
      '{"en": "Nothing is charged when you book. We check your ride, then send you a secure payment link, by email and WhatsApp, for an advance or the full amount. You pay on our payment provider’s secure page, and we never see or store your card details. Your booking is confirmed as soon as the payment arrives. A ride whose price is agreed with you, such as hourly hire of the minibus, is paid the same way once the price is set.", "es": "Al reservar no se cobra nada. Revisamos su trayecto y después le enviamos un enlace de pago seguro, por correo y WhatsApp, para un anticipo o el importe total. Paga en la página segura de nuestro proveedor de pagos, y nunca vemos ni almacenamos los datos de su tarjeta. Su reserva queda confirmada en cuanto llega el pago. Un servicio cuyo precio se acuerda con usted, como el minibús por horas, se paga igual una vez fijado el precio."}'::jsonb
    ),
    "updated_at" = now()
WHERE "collection" = 'faq'
  AND "data"->'answer'->>'en' LIKE 'You can pay your chauffeur on the day, by card or in cash.%';
