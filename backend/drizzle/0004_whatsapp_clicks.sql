CREATE TABLE "whatsapp_clicks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"visitor" text NOT NULL,
	"is_new" boolean NOT NULL,
	"page" text NOT NULL,
	"referrer" text,
	"language" text,
	"country_code" text,
	"country" text,
	"region" text,
	"city" text,
	"device_type" text NOT NULL,
	"os" text,
	"browser" text
);
--> statement-breakpoint
CREATE INDEX "whatsapp_clicks_created_at_idx" ON "whatsapp_clicks" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "whatsapp_clicks_visitor_idx" ON "whatsapp_clicks" USING btree ("visitor");