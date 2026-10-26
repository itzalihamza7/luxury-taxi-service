-- The Sprinter's hourly hire has no list price: it is agreed with the customer, who can still book it.
UPDATE "vehicles" SET "hourly_rate_cents" = NULL WHERE "slug" = 'mercedes-sprinter';
--> statement-breakpoint
-- The business's number for calls and WhatsApp from 26 October 2026 (Business details in the console).
UPDATE "settings"
SET "value" = jsonb_set(jsonb_set("value", '{phone}', '"+34 667 60 46 11"'), '{whatsapp}', '"34667604611"'),
    "updated_at" = now()
WHERE "key" = 'site';
