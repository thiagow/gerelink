CREATE TABLE "rate_limits" (
	"key" text PRIMARY KEY NOT NULL,
	"count" integer NOT NULL,
	"reset_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "operators" ALTER COLUMN "totp_secret_enc" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "operators" ADD COLUMN "totp_last_step" integer;