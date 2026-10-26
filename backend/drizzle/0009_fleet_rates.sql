-- The fixed price inside the M-30 takes over from the minimum fare (the next migration drops the old fare columns).
UPDATE "vehicles" SET "zone_fare_cents" = "min_fare_cents";
--> statement-breakpoint
-- The business's price list of 26 October 2026, in euro cents: the fixed price inside the M-30 (and
-- airport <-> M-30), the price per km beyond the M-30, and the hourly rate. The Sprinter's hourly
-- hire is agreed case by case: a later migration clears its hourly rate once the column allows it.
UPDATE "vehicles" SET "zone_fare_cents" = 9000, "per_km_cents" = 230, "hourly_rate_cents" = 8500, "active" = true WHERE "slug" = 'mercedes-e-class';
--> statement-breakpoint
UPDATE "vehicles" SET "zone_fare_cents" = 15000, "per_km_cents" = 350, "hourly_rate_cents" = 12000, "active" = true WHERE "slug" = 'mercedes-s-class';
--> statement-breakpoint
UPDATE "vehicles" SET "zone_fare_cents" = 9000, "per_km_cents" = 300, "hourly_rate_cents" = 9500, "active" = true WHERE "slug" = 'mercedes-v-class';
--> statement-breakpoint
UPDATE "vehicles" SET "zone_fare_cents" = 30000, "per_km_cents" = 600, "hourly_rate_cents" = 22000, "active" = true WHERE "slug" = 'mercedes-maybach';
--> statement-breakpoint
UPDATE "vehicles" SET "zone_fare_cents" = 30000, "per_km_cents" = 500, "active" = true WHERE "slug" = 'mercedes-sprinter';
--> statement-breakpoint
-- Not on the price list: hidden from the website for now, kept for the bookings that name them.
UPDATE "vehicles" SET "active" = false WHERE "slug" IN ('v-class-vip', 'toyota-yaris');
--> statement-breakpoint
INSERT INTO "vehicles" (
  "slug", "name", "category", "body_type", "passengers", "luggage",
  "base_fare_cents", "per_km_cents", "hourly_rate_cents", "min_fare_cents", "zone_fare_cents",
  "tagline", "description", "highlights", "image_url", "sort_order", "active"
) VALUES (
  'toyota-corolla', 'Toyota Corolla', 'economy', 'sedan', 4, 3,
  0, 130, 5000, 7000, 7000,
  '{"en": "Hybrid saloon", "es": "Berlina híbrida"}',
  '{"en": "A quiet, efficient hybrid saloon for everyday transfers: room for four, a proper boot for luggage, and the same professional chauffeur and fixed price as the rest of the fleet.", "es": "Una berlina híbrida silenciosa y eficiente para los traslados de cada día: sitio para cuatro, un maletero de verdad para el equipaje y el mismo chófer profesional y precio cerrado que el resto de la flota."}',
  '{"en": ["Our lowest fixed fares", "Quiet hybrid engine", "Room for four with their luggage"], "es": ["Nuestras tarifas cerradas más bajas", "Motor híbrido silencioso", "Sitio para cuatro con su equipaje"]}',
  NULL, 70, true
) ON CONFLICT ("slug") DO NOTHING;
--> statement-breakpoint
-- Bookings made before guest codes existed get one, so the team can give it to the customer.
UPDATE "bookings" SET "guest_code" = upper(substr(md5(random()::text || "id"::text), 1, 8)) WHERE "guest_code" IS NULL;
