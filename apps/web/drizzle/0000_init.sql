CREATE TYPE "public"."pix_key_type" AS ENUM('cpf', 'cnpj', 'email', 'phone', 'random');--> statement-breakpoint
CREATE TYPE "public"."plate_status" AS ENUM('active', 'suspended');--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"operator_id" uuid,
	"action" text NOT NULL,
	"customer_id" uuid,
	"plate_code" varchar(8),
	"detail" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"display_name" text NOT NULL,
	"pix_key_enc" text NOT NULL,
	"pix_key_type" "pix_key_type" NOT NULL,
	"pix_key_mask" text NOT NULL,
	"merchant_name" varchar(25) NOT NULL,
	"merchant_city" varchar(15) NOT NULL,
	"brand_color" varchar(7),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "operators" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"totp_secret_enc" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "operators_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "plates" (
	"code" varchar(8) PRIMARY KEY NOT NULL,
	"customer_id" uuid NOT NULL,
	"label" text,
	"status" "plate_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"token_hash" text PRIMARY KEY NOT NULL,
	"operator_id" uuid NOT NULL,
	"mfa_verified" boolean DEFAULT false NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_operator_id_operators_id_fk" FOREIGN KEY ("operator_id") REFERENCES "public"."operators"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plates" ADD CONSTRAINT "plates_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_operator_id_operators_id_fk" FOREIGN KEY ("operator_id") REFERENCES "public"."operators"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "plates_customer_idx" ON "plates" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "sessions_operator_idx" ON "sessions" USING btree ("operator_id");