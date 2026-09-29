CREATE TABLE "club_config" (
	"key" text PRIMARY KEY,
	"value" text NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
