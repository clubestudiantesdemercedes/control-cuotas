ALTER TABLE "people" ADD COLUMN "address_cobro" text;--> statement-breakpoint
ALTER TABLE "people" ADD COLUMN "tiene_debito_automatico" boolean DEFAULT false NOT NULL;