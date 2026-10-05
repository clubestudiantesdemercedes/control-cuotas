ALTER TABLE "cuotas_generadas" ADD COLUMN "dni" text;--> statement-breakpoint
ALTER TABLE "cuotas_generadas" ADD COLUMN "nombre_completo" text;--> statement-breakpoint
ALTER TABLE "cuotas_generadas" ADD COLUMN "nro_socio" text;--> statement-breakpoint
ALTER TABLE "cuotas_generadas" ADD COLUMN "subcategoria_cuota" text;--> statement-breakpoint
ALTER TABLE "cuotas_generadas" ADD COLUMN "disciplina_nombre" text;--> statement-breakpoint
ALTER TABLE "cuotas_generadas" ADD COLUMN "categoria_deportiva_nombre" text;--> statement-breakpoint
ALTER TABLE "cuotas_generadas" ADD COLUMN "tarifario_id" integer;--> statement-breakpoint
ALTER TABLE "inscripciones_deportivas" ADD COLUMN "subcategoria_cuota" text DEFAULT 'pleno' NOT NULL;--> statement-breakpoint
ALTER TABLE "memberships" ADD COLUMN "subcategoria_cuota" text DEFAULT 'pleno' NOT NULL;--> statement-breakpoint
ALTER TABLE "people" ADD COLUMN "beca" boolean DEFAULT false NOT NULL;