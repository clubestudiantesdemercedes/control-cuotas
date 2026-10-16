ALTER TABLE "pagos" ADD COLUMN "estado" text DEFAULT 'activo' NOT NULL;--> statement-breakpoint
ALTER TABLE "pagos" ADD COLUMN "anulado_en" timestamp;--> statement-breakpoint
ALTER TABLE "pagos" ADD COLUMN "anulado_por" integer;--> statement-breakpoint
ALTER TABLE "pagos" ADD COLUMN "motivo_anulacion" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "permissions" jsonb DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "pagos" ADD CONSTRAINT "pagos_anulado_por_users_id_fkey" FOREIGN KEY ("anulado_por") REFERENCES "users"("id");