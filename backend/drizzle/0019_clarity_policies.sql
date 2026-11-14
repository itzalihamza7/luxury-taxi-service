-- Microsoft Clarity (14 November 2026), loaded only for visitors who accept analytics cookies: the cookie
-- policy names it and its cookies, and the privacy policy lists it among those who receive data. Only texts
-- still as seeded are changed: a text the team edited in the console stays.
UPDATE "content_entries"
SET "data" = jsonb_set(jsonb_insert("data", '{sections,en,1,paragraphs,1}', '"With your consent we use Microsoft Clarity to see how visitors use the site: clicks, scrolling and anonymised recordings of visits, with what you type into forms masked. Clarity sets the cookies _clck (one year) and _clsk (one day). Microsoft processes this data under its own privacy statement."'), '{updated}', '"2026-11-14"'),
    "updated_at" = now()
WHERE "collection" = 'legal' AND "slug" = 'cookies'
  AND "data" #>> '{sections,en,1,heading}' = 'Analytics'
  AND jsonb_array_length("data" #> '{sections,en,1,paragraphs}') = 1;
--> statement-breakpoint
UPDATE "content_entries"
SET "data" = jsonb_set(jsonb_insert("data", '{sections,es,1,paragraphs,1}', '"Con su consentimiento usamos Microsoft Clarity para ver cómo se usa el sitio: clics, desplazamiento y grabaciones anonimizadas de las visitas, con lo que escribe en los formularios enmascarado. Clarity crea las cookies _clck (un año) y _clsk (un día). Microsoft trata estos datos conforme a su propia declaración de privacidad."'), '{updated}', '"2026-11-14"'),
    "updated_at" = now()
WHERE "collection" = 'legal' AND "slug" = 'cookies'
  AND "data" #>> '{sections,es,1,heading}' = 'Analítica'
  AND jsonb_array_length("data" #> '{sections,es,1,paragraphs}') = 1;
--> statement-breakpoint
UPDATE "content_entries"
SET "data" = jsonb_set(jsonb_insert("data", '{sections,en,3,paragraphs,2}', '"If you accept analytics cookies, Microsoft Clarity receives data on how you use the site (clicks, scrolling, pages visited and device details), with what you type into forms masked. See the cookie policy."'), '{updated}', '"2026-11-14"'),
    "updated_at" = now()
WHERE "collection" = 'legal' AND "slug" = 'privacy'
  AND "data" #>> '{sections,en,3,heading}' = '4. Who receives it'
  AND "data" #>> '{sections,en,3,paragraphs,2}' = 'We use service providers for hosting and email. We do not sell personal data.';
--> statement-breakpoint
UPDATE "content_entries"
SET "data" = jsonb_set(jsonb_insert("data", '{sections,es,3,paragraphs,2}', '"Si acepta las cookies de analítica, Microsoft Clarity recibe datos sobre cómo usa el sitio (clics, desplazamiento, páginas visitadas y datos del dispositivo), con lo que escribe en los formularios enmascarado. Consulte la política de cookies."'), '{updated}', '"2026-11-14"'),
    "updated_at" = now()
WHERE "collection" = 'legal' AND "slug" = 'privacy'
  AND "data" #>> '{sections,es,3,heading}' = '4. Quién los recibe'
  AND "data" #>> '{sections,es,3,paragraphs,2}' = 'Utilizamos proveedores de servicios de alojamiento y correo electrónico. No vendemos datos personales.';
