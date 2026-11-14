-- Company details become optional (14 November 2026): an empty detail is left out of the legal pages, and
-- "hidden" (Business details → Hide company details) leaves them all out. The placeholders a database was
-- seeded with ("[NIF]" and so on) are emptied; while no real detail is filled in, the details start hidden.
-- Details the team already filled in stay, and stay shown.
UPDATE "settings"
SET "value" = jsonb_set(
      "value",
      '{legal}',
      (SELECT jsonb_object_agg("key", CASE WHEN "value" #>> '{}' ~ '^\s*\[.*\]\s*$' THEN '""'::jsonb ELSE "value" END) FROM jsonb_each("settings"."value"->'legal'))
        || jsonb_build_object('hidden', NOT EXISTS (
          SELECT 1 FROM jsonb_each_text("settings"."value"->'legal') WHERE btrim("value") <> '' AND "value" !~ '^\s*\[.*\]\s*$'
        ))
    ),
    "updated_at" = now()
WHERE "key" = 'site' AND jsonb_typeof("value"->'legal') = 'object' AND NOT ("value"->'legal' ? 'hidden');
--> statement-breakpoint
-- The sentences naming the company move into list lines, so a hidden or empty detail drops out without
-- breaking a sentence. Only texts still as seeded are replaced: a text the team edited in the console stays.
UPDATE "content_entries"
SET "data" = jsonb_set(jsonb_set("data", '{sections,en,0}', '{"heading": "1. Who we are", "paragraphs": ["These terms govern the use of this website and the chauffeur services offered by {brand} (\"we\")."], "list": ["Company name: {companyName}", "Tax ID: {taxId}", "Registered address: {address}"]}'::jsonb), '{updated}', '"2026-11-14"'),
    "updated_at" = now()
WHERE "collection" = 'legal' AND "slug" = 'terms'
  AND "data" #>> '{sections,en,0,paragraphs,0}' = 'These terms govern the use of this website and the chauffeur services offered by {companyName} ("{brand}", "we"), tax ID {taxId}, with registered address at {address}.';
--> statement-breakpoint
UPDATE "content_entries"
SET "data" = jsonb_set(jsonb_set("data", '{sections,es,0}', '{"heading": "1. Quiénes somos", "paragraphs": ["Estas condiciones regulan el uso de este sitio web y los servicios de chófer ofrecidos por {brand} («nosotros»)."], "list": ["Denominación social: {companyName}", "NIF: {taxId}", "Domicilio social: {address}"]}'::jsonb), '{updated}', '"2026-11-14"'),
    "updated_at" = now()
WHERE "collection" = 'legal' AND "slug" = 'terms'
  AND "data" #>> '{sections,es,0,paragraphs,0}' = 'Estas condiciones regulan el uso de este sitio web y los servicios de chófer ofrecidos por {companyName} («{brand}», «nosotros»), con NIF {taxId} y domicilio social en {address}.';
--> statement-breakpoint
UPDATE "content_entries"
SET "data" = jsonb_set(jsonb_set("data", '{sections,en,0}', '{"heading": "1. Data controller", "paragraphs": ["{brand} is responsible for the personal data collected on this website. Contact for privacy matters: {email}."], "list": ["Company name: {companyName}", "Tax ID: {taxId}", "Registered address: {address}"]}'::jsonb), '{updated}', '"2026-11-14"'),
    "updated_at" = now()
WHERE "collection" = 'legal' AND "slug" = 'privacy'
  AND "data" #>> '{sections,en,0,paragraphs,0}' = '{companyName}, tax ID {taxId}, {address}. Contact for privacy matters: {email}.';
--> statement-breakpoint
UPDATE "content_entries"
SET "data" = jsonb_set(jsonb_set("data", '{sections,es,0}', '{"heading": "1. Responsable del tratamiento", "paragraphs": ["{brand} es responsable de los datos personales recogidos en este sitio web. Contacto en materia de privacidad: {email}."], "list": ["Denominación social: {companyName}", "NIF: {taxId}", "Domicilio social: {address}"]}'::jsonb), '{updated}', '"2026-11-14"'),
    "updated_at" = now()
WHERE "collection" = 'legal' AND "slug" = 'privacy'
  AND "data" #>> '{sections,es,0,paragraphs,0}' = '{companyName}, NIF {taxId}, {address}. Contacto en materia de privacidad: {email}.';
