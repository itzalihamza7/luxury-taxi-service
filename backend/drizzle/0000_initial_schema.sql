CREATE TABLE "bookings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reference" text NOT NULL,
	"user_id" uuid,
	"quote_id" uuid,
	"status" text DEFAULT 'pending' NOT NULL,
	"ride_type" text NOT NULL,
	"pickup_label" text NOT NULL,
	"pickup_lat" double precision NOT NULL,
	"pickup_lng" double precision NOT NULL,
	"dropoff_label" text,
	"dropoff_lat" double precision,
	"dropoff_lng" double precision,
	"pickup_at" timestamp with time zone NOT NULL,
	"return_at" timestamp with time zone,
	"hours" integer,
	"flight_number" text,
	"adults" integer NOT NULL,
	"children" integer NOT NULL,
	"luggage" integer NOT NULL,
	"vehicle_id" uuid NOT NULL,
	"vehicle_name" text NOT NULL,
	"distance_m" integer,
	"duration_s" integer,
	"route_source" text,
	"total_cents" integer NOT NULL,
	"currency" text NOT NULL,
	"payment_method" text NOT NULL,
	"payment_status" text DEFAULT 'unpaid' NOT NULL,
	"payment_ref" text,
	"paid_at" timestamp with time zone,
	"contact_name" text NOT NULL,
	"contact_email" text NOT NULL,
	"contact_phone" text NOT NULL,
	"company" text,
	"notes" text,
	"locale" text DEFAULT 'en' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"cancelled_at" timestamp with time zone,
	CONSTRAINT "bookings_reference_unique" UNIQUE("reference"),
	CONSTRAINT "bookings_quote_id_unique" UNIQUE("quote_id"),
	CONSTRAINT "bookings_status_check" CHECK ("bookings"."status" in ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled')),
	CONSTRAINT "bookings_payment_method_check" CHECK ("bookings"."payment_method" in ('chauffeur', 'online')),
	CONSTRAINT "bookings_payment_status_check" CHECK ("bookings"."payment_status" in ('unpaid', 'paid')),
	CONSTRAINT "bookings_total_check" CHECK ("bookings"."total_cents" >= 0)
);
--> statement-breakpoint
CREATE TABLE "contact_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"subject" text NOT NULL,
	"message" text NOT NULL,
	"locale" text DEFAULT 'en' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "newsletter_subscribers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"locale" text DEFAULT 'en' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "newsletter_subscribers_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "quotes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ride_type" text NOT NULL,
	"pickup" jsonb NOT NULL,
	"dropoff" jsonb,
	"pickup_at" timestamp with time zone NOT NULL,
	"return_at" timestamp with time zone,
	"hours" integer,
	"adults" integer NOT NULL,
	"children" integer NOT NULL,
	"luggage" integer NOT NULL,
	"distance_m" integer,
	"duration_s" integer,
	"route_source" text,
	"options" jsonb NOT NULL,
	"currency" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sessions_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"name" text NOT NULL,
	"phone" text,
	"role" text DEFAULT 'customer' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_role_check" CHECK ("users"."role" in ('customer', 'admin'))
);
--> statement-breakpoint
CREATE TABLE "vehicles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"body_type" text NOT NULL,
	"passengers" integer NOT NULL,
	"luggage" integer NOT NULL,
	"base_fare_cents" integer NOT NULL,
	"per_km_cents" integer NOT NULL,
	"hourly_rate_cents" integer NOT NULL,
	"min_fare_cents" integer NOT NULL,
	"tagline" jsonb NOT NULL,
	"description" jsonb NOT NULL,
	"highlights" jsonb NOT NULL,
	"image_url" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "vehicles_slug_unique" UNIQUE("slug"),
	CONSTRAINT "vehicles_capacity_check" CHECK ("vehicles"."passengers" > 0 and "vehicles"."luggage" >= 0),
	CONSTRAINT "vehicles_rates_check" CHECK ("vehicles"."base_fare_cents" >= 0 and "vehicles"."per_km_cents" >= 0 and "vehicles"."hourly_rate_cents" >= 0 and "vehicles"."min_fare_cents" >= 0)
);
--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_quote_id_quotes_id_fk" FOREIGN KEY ("quote_id") REFERENCES "public"."quotes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "bookings_user_id_idx" ON "bookings" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "bookings_contact_email_idx" ON "bookings" USING btree ("contact_email");--> statement-breakpoint
CREATE INDEX "bookings_pickup_at_idx" ON "bookings" USING btree ("pickup_at");--> statement-breakpoint
CREATE INDEX "bookings_status_idx" ON "bookings" USING btree ("status");--> statement-breakpoint
CREATE INDEX "bookings_payment_ref_idx" ON "bookings" USING btree ("payment_ref");--> statement-breakpoint
CREATE INDEX "sessions_user_id_idx" ON "sessions" USING btree ("user_id");