CREATE TABLE "payment_proofs" (
	"payment_id" uuid PRIMARY KEY NOT NULL,
	"content_type" text NOT NULL,
	"size" integer NOT NULL,
	"data" "bytea" NOT NULL,
	"uploaded_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "booking_payments" ADD COLUMN "proof_uploaded_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "payment_proofs" ADD CONSTRAINT "payment_proofs_payment_id_booking_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."booking_payments"("id") ON DELETE cascade ON UPDATE no action;