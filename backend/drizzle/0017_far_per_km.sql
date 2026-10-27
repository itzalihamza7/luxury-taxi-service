ALTER TABLE "vehicles" DROP CONSTRAINT "vehicles_rates_check";--> statement-breakpoint
ALTER TABLE "vehicles" ADD COLUMN "far_per_km_cents" integer;--> statement-breakpoint
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_rates_check" CHECK ("vehicles"."zone_fare_cents" >= 0 and "vehicles"."per_km_cents" >= 0 and ("vehicles"."far_per_km_cents" is null or "vehicles"."far_per_km_cents" >= 0) and ("vehicles"."hourly_rate_cents" is null or "vehicles"."hourly_rate_cents" >= 0));--> statement-breakpoint
-- The price list of 27 October 2026: the V-Class charges 2.30 € per km more than 120 km from the
-- centre of Madrid (3.00 € per km between the M-30 and there). Every other vehicle keeps its price
-- per km there too (null).
UPDATE "vehicles" SET "far_per_km_cents" = 230 WHERE "slug" = 'mercedes-v-class';
