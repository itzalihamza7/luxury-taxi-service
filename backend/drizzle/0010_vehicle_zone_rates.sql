ALTER TABLE "vehicles" DROP CONSTRAINT "vehicles_rates_check";--> statement-breakpoint
ALTER TABLE "vehicles" ALTER COLUMN "hourly_rate_cents" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "vehicles" ALTER COLUMN "zone_fare_cents" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "vehicles" DROP COLUMN "base_fare_cents";--> statement-breakpoint
ALTER TABLE "vehicles" DROP COLUMN "min_fare_cents";--> statement-breakpoint
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_rates_check" CHECK ("vehicles"."zone_fare_cents" >= 0 and "vehicles"."per_km_cents" >= 0 and ("vehicles"."hourly_rate_cents" is null or "vehicles"."hourly_rate_cents" >= 0));