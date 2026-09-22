CREATE TABLE "categorias_deportivas" (
	"id" serial PRIMARY KEY,
	"disciplina_id" integer NOT NULL,
	"nombre" text NOT NULL,
	"edad_desde" integer,
	"edad_hasta" integer,
	"meses_cobro" jsonb NOT NULL,
	"activa" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cuotas_generadas" (
	"id" serial PRIMARY KEY,
	"socio_id" integer NOT NULL,
	"tipo_cuota" text NOT NULL,
	"disciplina_id" integer,
	"categoria_deportiva_id" integer,
	"periodo" text NOT NULL,
	"concepto" text NOT NULL,
	"monto_original" numeric(12,2) NOT NULL,
	"monto_final" numeric(12,2) NOT NULL,
	"fecha_vencimiento" date NOT NULL,
	"estado" text DEFAULT 'pendiente' NOT NULL,
	"generada_en" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "disciplinas" (
	"id" serial PRIMARY KEY,
	"nombre" text NOT NULL,
	"activa" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "generaciones_cuotas" (
	"id" serial PRIMARY KEY,
	"periodo" text NOT NULL,
	"ejecutado_por" integer,
	"cantidad_socios" integer DEFAULT 0 NOT NULL,
	"cantidad_cuotas" integer DEFAULT 0 NOT NULL,
	"cantidad_errores" integer DEFAULT 0 NOT NULL,
	"modo" text DEFAULT 'normal' NOT NULL,
	"log" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "grupos_familiares" (
	"id" serial PRIMARY KEY,
	"nombre" text NOT NULL,
	"activo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inscripciones_deportivas" (
	"id" serial PRIMARY KEY,
	"socio_id" integer NOT NULL,
	"disciplina_id" integer NOT NULL,
	"categoria_deportiva_id" integer NOT NULL,
	"es_hermano" boolean DEFAULT false NOT NULL,
	"es_tercer_hermano" boolean DEFAULT false NOT NULL,
	"es_segundo_deporte" boolean DEFAULT false NOT NULL,
	"fecha_inicio" date NOT NULL,
	"fecha_fin" date,
	"activa" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "medios_pago" (
	"id" serial PRIMARY KEY,
	"nombre" text NOT NULL,
	"tipo" text NOT NULL,
	"alias" text,
	"cbu" text,
	"datos_pago" text,
	"activa" boolean DEFAULT true NOT NULL,
	"orden" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pago_cuotas" (
	"id" serial PRIMARY KEY,
	"pago_id" integer NOT NULL,
	"cuota_id" integer NOT NULL,
	"monto_aplicado" numeric(12,2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pagos" (
	"id" serial PRIMARY KEY,
	"socio_id" integer,
	"grupo_familiar_id" integer,
	"fecha_pago" date NOT NULL,
	"monto_total" numeric(12,2) NOT NULL,
	"medio_pago_id" integer NOT NULL,
	"referencia" text,
	"periodo" text,
	"observacion" text,
	"cargado_por" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "socios" (
	"id" serial PRIMARY KEY,
	"numero_socio" text NOT NULL,
	"documento" text NOT NULL,
	"apellido" text NOT NULL,
	"nombre" text NOT NULL,
	"fecha_nacimiento" date,
	"tipo_socio_social" text NOT NULL,
	"grupo_familiar_id" integer,
	"tiene_debito_automatico" boolean DEFAULT false NOT NULL,
	"activo" boolean DEFAULT true NOT NULL,
	"observaciones" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tarifario" (
	"id" serial PRIMARY KEY,
	"tipo_cuota" text NOT NULL,
	"tipo_socio_social" text,
	"disciplina_id" integer,
	"categoria_deportiva_id" integer,
	"es_hermano" boolean DEFAULT false NOT NULL,
	"es_tercer_hermano" boolean DEFAULT false NOT NULL,
	"es_segundo_deporte" boolean DEFAULT false NOT NULL,
	"monto" numeric(12,2) NOT NULL,
	"vigencia_desde" date NOT NULL,
	"vigencia_hasta" date,
	"descripcion" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY,
	"username" text NOT NULL UNIQUE,
	"password_hash" text NOT NULL,
	"full_name" text NOT NULL,
	"role" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "cuota_unica_idx" ON "cuotas_generadas" ("socio_id","tipo_cuota","disciplina_id","periodo");--> statement-breakpoint
CREATE UNIQUE INDEX "pago_cuota_idx" ON "pago_cuotas" ("pago_id","cuota_id");--> statement-breakpoint
CREATE UNIQUE INDEX "socios_numero_idx" ON "socios" ("numero_socio");--> statement-breakpoint
CREATE UNIQUE INDEX "socios_documento_idx" ON "socios" ("documento");--> statement-breakpoint
ALTER TABLE "categorias_deportivas" ADD CONSTRAINT "categorias_deportivas_disciplina_id_disciplinas_id_fkey" FOREIGN KEY ("disciplina_id") REFERENCES "disciplinas"("id");--> statement-breakpoint
ALTER TABLE "cuotas_generadas" ADD CONSTRAINT "cuotas_generadas_socio_id_socios_id_fkey" FOREIGN KEY ("socio_id") REFERENCES "socios"("id");--> statement-breakpoint
ALTER TABLE "cuotas_generadas" ADD CONSTRAINT "cuotas_generadas_disciplina_id_disciplinas_id_fkey" FOREIGN KEY ("disciplina_id") REFERENCES "disciplinas"("id");--> statement-breakpoint
ALTER TABLE "cuotas_generadas" ADD CONSTRAINT "cuotas_generadas_z1cLooh4RUe6_fkey" FOREIGN KEY ("categoria_deportiva_id") REFERENCES "categorias_deportivas"("id");--> statement-breakpoint
ALTER TABLE "generaciones_cuotas" ADD CONSTRAINT "generaciones_cuotas_ejecutado_por_users_id_fkey" FOREIGN KEY ("ejecutado_por") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "inscripciones_deportivas" ADD CONSTRAINT "inscripciones_deportivas_socio_id_socios_id_fkey" FOREIGN KEY ("socio_id") REFERENCES "socios"("id");--> statement-breakpoint
ALTER TABLE "inscripciones_deportivas" ADD CONSTRAINT "inscripciones_deportivas_disciplina_id_disciplinas_id_fkey" FOREIGN KEY ("disciplina_id") REFERENCES "disciplinas"("id");--> statement-breakpoint
ALTER TABLE "inscripciones_deportivas" ADD CONSTRAINT "inscripciones_deportivas_AH0xgWB6IV9l_fkey" FOREIGN KEY ("categoria_deportiva_id") REFERENCES "categorias_deportivas"("id");--> statement-breakpoint
ALTER TABLE "pago_cuotas" ADD CONSTRAINT "pago_cuotas_pago_id_pagos_id_fkey" FOREIGN KEY ("pago_id") REFERENCES "pagos"("id");--> statement-breakpoint
ALTER TABLE "pago_cuotas" ADD CONSTRAINT "pago_cuotas_cuota_id_cuotas_generadas_id_fkey" FOREIGN KEY ("cuota_id") REFERENCES "cuotas_generadas"("id");--> statement-breakpoint
ALTER TABLE "pagos" ADD CONSTRAINT "pagos_socio_id_socios_id_fkey" FOREIGN KEY ("socio_id") REFERENCES "socios"("id");--> statement-breakpoint
ALTER TABLE "pagos" ADD CONSTRAINT "pagos_grupo_familiar_id_grupos_familiares_id_fkey" FOREIGN KEY ("grupo_familiar_id") REFERENCES "grupos_familiares"("id");--> statement-breakpoint
ALTER TABLE "pagos" ADD CONSTRAINT "pagos_medio_pago_id_medios_pago_id_fkey" FOREIGN KEY ("medio_pago_id") REFERENCES "medios_pago"("id");--> statement-breakpoint
ALTER TABLE "pagos" ADD CONSTRAINT "pagos_cargado_por_users_id_fkey" FOREIGN KEY ("cargado_por") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "socios" ADD CONSTRAINT "socios_grupo_familiar_id_grupos_familiares_id_fkey" FOREIGN KEY ("grupo_familiar_id") REFERENCES "grupos_familiares"("id");--> statement-breakpoint
ALTER TABLE "tarifario" ADD CONSTRAINT "tarifario_disciplina_id_disciplinas_id_fkey" FOREIGN KEY ("disciplina_id") REFERENCES "disciplinas"("id");--> statement-breakpoint
ALTER TABLE "tarifario" ADD CONSTRAINT "tarifario_categoria_deportiva_id_categorias_deportivas_id_fkey" FOREIGN KEY ("categoria_deportiva_id") REFERENCES "categorias_deportivas"("id");