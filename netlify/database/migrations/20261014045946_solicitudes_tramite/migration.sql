CREATE TABLE "solicitudes_tramite" (
	"id" serial PRIMARY KEY,
	"tipo" text NOT NULL,
	"estado" text DEFAULT 'pendiente' NOT NULL,
	"document_type" text DEFAULT 'DNI' NOT NULL,
	"document_number" text NOT NULL,
	"last_name" text NOT NULL,
	"first_name" text NOT NULL,
	"birth_date" date,
	"genero" text,
	"phone" text,
	"phone_alt" text,
	"email" text,
	"domicilio_calle" text,
	"domicilio_localidad" text,
	"domicilio_partido" text,
	"domicilio_provincia" text,
	"domicilio_cp" text,
	"domicilio_cobro_distinto" boolean DEFAULT false NOT NULL,
	"domicilio_cobro_calle" text,
	"domicilio_cobro_localidad" text,
	"domicilio_cobro_obs" text,
	"member_number_sugerido" text,
	"es_deportista" boolean DEFAULT false NOT NULL,
	"disciplina_id" integer,
	"solicita_beca" boolean DEFAULT false NOT NULL,
	"forma_pago" text,
	"medio_pago_id" integer,
	"grupo_familiar_nota" text,
	"foto_carnet_key" text,
	"observacion_solicitante" text,
	"motivo_baja" text,
	"person_id" integer,
	"motivo_rechazo" text,
	"revisado_por" integer,
	"revisado_en" timestamp,
	"notas_admin" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "solicitudes_doc_idx" ON "solicitudes_tramite" ("document_number");--> statement-breakpoint
CREATE INDEX "solicitudes_estado_idx" ON "solicitudes_tramite" ("estado");--> statement-breakpoint
CREATE INDEX "solicitudes_tipo_idx" ON "solicitudes_tramite" ("tipo");--> statement-breakpoint
ALTER TABLE "solicitudes_tramite" ADD CONSTRAINT "solicitudes_tramite_disciplina_id_disciplinas_id_fkey" FOREIGN KEY ("disciplina_id") REFERENCES "disciplinas"("id");--> statement-breakpoint
ALTER TABLE "solicitudes_tramite" ADD CONSTRAINT "solicitudes_tramite_medio_pago_id_medios_pago_id_fkey" FOREIGN KEY ("medio_pago_id") REFERENCES "medios_pago"("id");--> statement-breakpoint
ALTER TABLE "solicitudes_tramite" ADD CONSTRAINT "solicitudes_tramite_person_id_people_id_fkey" FOREIGN KEY ("person_id") REFERENCES "people"("id");--> statement-breakpoint
ALTER TABLE "solicitudes_tramite" ADD CONSTRAINT "solicitudes_tramite_revisado_por_users_id_fkey" FOREIGN KEY ("revisado_por") REFERENCES "users"("id");