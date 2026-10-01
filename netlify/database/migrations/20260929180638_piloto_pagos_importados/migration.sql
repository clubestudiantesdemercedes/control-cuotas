CREATE TABLE "import_batches" (
	"id" serial PRIMARY KEY,
	"source" text DEFAULT 'xlsx' NOT NULL,
	"file_name" text,
	"total_rows" integer DEFAULT 0 NOT NULL,
	"new_rows" integer DEFAULT 0 NOT NULL,
	"existing_rows" integer DEFAULT 0 NOT NULL,
	"error_rows" integer DEFAULT 0 NOT NULL,
	"no_dni_rows" integer DEFAULT 0 NOT NULL,
	"imported_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pagos_importados" (
	"id" serial PRIMARY KEY,
	"person_id" integer,
	"dni" text,
	"fecha_pago" date NOT NULL,
	"periodo" text NOT NULL,
	"nombre_socio" text,
	"pagador" text,
	"categoria" text,
	"importe" numeric(12,2) NOT NULL,
	"forma_pago" text,
	"source" text DEFAULT 'xlsx' NOT NULL,
	"fingerprint" text NOT NULL,
	"import_batch_id" integer,
	"imported_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "pagos_importados_fingerprint_idx" ON "pagos_importados" ("fingerprint");--> statement-breakpoint
CREATE INDEX "pagos_importados_dni_idx" ON "pagos_importados" ("dni");--> statement-breakpoint
CREATE INDEX "pagos_importados_periodo_idx" ON "pagos_importados" ("periodo");--> statement-breakpoint
ALTER TABLE "pagos_importados" ADD CONSTRAINT "pagos_importados_person_id_people_id_fkey" FOREIGN KEY ("person_id") REFERENCES "people"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "pagos_importados" ADD CONSTRAINT "pagos_importados_import_batch_id_import_batches_id_fkey" FOREIGN KEY ("import_batch_id") REFERENCES "import_batches"("id") ON DELETE SET NULL;