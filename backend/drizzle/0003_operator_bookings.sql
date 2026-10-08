ALTER TABLE "bookings" ALTER COLUMN "contact_email" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "bookings" ALTER COLUMN "contact_phone" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "source" text DEFAULT 'website' NOT NULL;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_source_check" CHECK ("bookings"."source" in ('website', 'operator'));--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_contact_check" CHECK ("bookings"."contact_email" is not null or "bookings"."contact_phone" is not null);