-- On the live site the Yaris had already become the Corolla in the console (web address toyota-corolla,
-- its own photo), keeping the Yaris's rates, so 0009 left it alone. It takes the rates of the price list
-- of 26 October 2026, in euro cents: 70 inside the M-30, 1.30 per km beyond it, 50 an hour.
UPDATE "vehicles" SET "zone_fare_cents" = 7000, "per_km_cents" = 130, "hourly_rate_cents" = 5000 WHERE "slug" = 'toyota-corolla';
--> statement-breakpoint
-- And its name as Toyota writes it, where it was typed "Corola".
UPDATE "vehicles" SET "name" = 'Toyota Corolla' WHERE "slug" = 'toyota-corolla' AND "name" = 'Toyota Corola';
