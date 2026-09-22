CREATE TABLE "digital_accounts" (
	"id" serial PRIMARY KEY,
	"person_id" integer NOT NULL,
	"status" text DEFAULT 'activo' NOT NULL,
	"login_email" text,
	"password_hash" text,
	"email_verified" boolean DEFAULT false NOT NULL,
	"phone_verified" boolean DEFAULT false NOT NULL,
	"last_login_at" timestamp,
	"password_changed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "families" (
	"id" serial PRIMARY KEY,
	"name" text NOT NULL,
	"primary_person_id" integer,
	"status" text DEFAULT 'activo' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "family_members" (
	"id" serial PRIMARY KEY,
	"family_id" integer NOT NULL,
	"person_id" integer NOT NULL,
	"relationship" text,
	"valid_from" date,
	"valid_to" date,
	"is_payment_responsible" boolean DEFAULT false NOT NULL,
	"can_manage_in_app" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "memberships" (
	"id" serial PRIMARY KEY,
	"person_id" integer NOT NULL,
	"member_number" text,
	"category" text,
	"status" text DEFAULT 'activo' NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date,
	"end_reason" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "people" (
	"id" serial PRIMARY KEY,
	"document_type" text DEFAULT 'DNI' NOT NULL,
	"document_number" text NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"birth_date" date,
	"photo_url" text,
	"status" text DEFAULT 'activo' NOT NULL,
	"phone" text,
	"phone_alt" text,
	"email" text,
	"address" text,
	"city" text,
	"postal_code" text,
	"club_registered_at" date,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"record_source" text,
	"notes" text
);
--> statement-breakpoint
ALTER TABLE "cuotas_generadas" DROP CONSTRAINT "cuotas_generadas_socio_id_socios_id_fkey";--> statement-breakpoint
ALTER TABLE "inscripciones_deportivas" DROP CONSTRAINT "inscripciones_deportivas_socio_id_socios_id_fkey";--> statement-breakpoint
ALTER TABLE "pagos" DROP CONSTRAINT "pagos_socio_id_socios_id_fkey";--> statement-breakpoint
ALTER TABLE "pagos" DROP CONSTRAINT "pagos_grupo_familiar_id_grupos_familiares_id_fkey";--> statement-breakpoint
ALTER TABLE "socios" DROP CONSTRAINT "socios_grupo_familiar_id_grupos_familiares_id_fkey";--> statement-breakpoint
DROP TABLE "grupos_familiares";--> statement-breakpoint
DROP TABLE "socios";--> statement-breakpoint
DROP INDEX "cuota_unica_idx";--> statement-breakpoint
ALTER TABLE "cuotas_generadas" ADD COLUMN "person_id" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "cuotas_generadas" ADD COLUMN "membership_id" integer;--> statement-breakpoint
ALTER TABLE "generaciones_cuotas" ADD COLUMN "cantidad_personas" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "inscripciones_deportivas" ADD COLUMN "person_id" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "pagos" ADD COLUMN "person_id" integer;--> statement-breakpoint
ALTER TABLE "pagos" ADD COLUMN "family_id" integer;--> statement-breakpoint
ALTER TABLE "cuotas_generadas" DROP COLUMN "socio_id";--> statement-breakpoint
ALTER TABLE "generaciones_cuotas" DROP COLUMN "cantidad_socios";--> statement-breakpoint
ALTER TABLE "inscripciones_deportivas" DROP COLUMN "socio_id";--> statement-breakpoint
ALTER TABLE "pagos" DROP COLUMN "socio_id";--> statement-breakpoint
ALTER TABLE "pagos" DROP COLUMN "grupo_familiar_id";--> statement-breakpoint
CREATE UNIQUE INDEX "cuota_unica_person_idx" ON "cuotas_generadas" ("person_id","tipo_cuota","disciplina_id","periodo");--> statement-breakpoint
CREATE UNIQUE INDEX "digital_accounts_person_idx" ON "digital_accounts" ("person_id");--> statement-breakpoint
CREATE UNIQUE INDEX "digital_accounts_email_idx" ON "digital_accounts" ("login_email");--> statement-breakpoint
CREATE UNIQUE INDEX "family_person_idx" ON "family_members" ("family_id","person_id");--> statement-breakpoint
CREATE UNIQUE INDEX "memberships_member_number_idx" ON "memberships" ("member_number");--> statement-breakpoint
CREATE UNIQUE INDEX "people_document_idx" ON "people" ("document_type","document_number");--> statement-breakpoint
ALTER TABLE "cuotas_generadas" ADD CONSTRAINT "cuotas_generadas_person_id_people_id_fkey" FOREIGN KEY ("person_id") REFERENCES "people"("id");--> statement-breakpoint
ALTER TABLE "cuotas_generadas" ADD CONSTRAINT "cuotas_generadas_membership_id_memberships_id_fkey" FOREIGN KEY ("membership_id") REFERENCES "memberships"("id");--> statement-breakpoint
ALTER TABLE "digital_accounts" ADD CONSTRAINT "digital_accounts_person_id_people_id_fkey" FOREIGN KEY ("person_id") REFERENCES "people"("id");--> statement-breakpoint
ALTER TABLE "families" ADD CONSTRAINT "families_primary_person_id_people_id_fkey" FOREIGN KEY ("primary_person_id") REFERENCES "people"("id");--> statement-breakpoint
ALTER TABLE "family_members" ADD CONSTRAINT "family_members_family_id_families_id_fkey" FOREIGN KEY ("family_id") REFERENCES "families"("id");--> statement-breakpoint
ALTER TABLE "family_members" ADD CONSTRAINT "family_members_person_id_people_id_fkey" FOREIGN KEY ("person_id") REFERENCES "people"("id");--> statement-breakpoint
ALTER TABLE "inscripciones_deportivas" ADD CONSTRAINT "inscripciones_deportivas_person_id_people_id_fkey" FOREIGN KEY ("person_id") REFERENCES "people"("id");--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_person_id_people_id_fkey" FOREIGN KEY ("person_id") REFERENCES "people"("id");--> statement-breakpoint
ALTER TABLE "pagos" ADD CONSTRAINT "pagos_person_id_people_id_fkey" FOREIGN KEY ("person_id") REFERENCES "people"("id");--> statement-breakpoint
ALTER TABLE "pagos" ADD CONSTRAINT "pagos_family_id_families_id_fkey" FOREIGN KEY ("family_id") REFERENCES "families"("id");