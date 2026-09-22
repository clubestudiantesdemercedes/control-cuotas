import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  date,
  timestamp,
  numeric,
  jsonb,
  uniqueIndex,
} from 'drizzle-orm/pg-core'

// ============================================================
// IDENTIDAD CENTRAL (común Club)
// ============================================================

export const people = pgTable(
  'people',
  {
    id: serial('id').primaryKey(),
    documentType: text('document_type').notNull().default('DNI'),
    documentNumber: text('document_number').notNull(),
    firstName: text('first_name').notNull(),
    lastName: text('last_name').notNull(),
    birthDate: date('birth_date'),
    photoUrl: text('photo_url'),
    status: text('status').notNull().default('activo'), // activo | inactivo
    phone: text('phone'),
    phoneAlt: text('phone_alt'),
    email: text('email'),
    address: text('address'),
    city: text('city'),
    postalCode: text('postal_code'),
    clubRegisteredAt: date('club_registered_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    recordSource: text('record_source'),
    notes: text('notes'),
  },
  (t) => [
    uniqueIndex('people_document_idx').on(t.documentType, t.documentNumber),
  ],
)

export const memberships = pgTable(
  'memberships',
  {
    id: serial('id').primaryKey(),
    personId: integer('person_id')
      .notNull()
      .references(() => people.id),
    memberNumber: text('member_number'),
    category: text('category'), // menor | activo | vitalicio
    status: text('status').notNull().default('activo'), // activo | baja | suspendido
    startDate: date('start_date').notNull(),
    endDate: date('end_date'),
    endReason: text('end_reason'),
    notes: text('notes'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => [uniqueIndex('memberships_member_number_idx').on(t.memberNumber)],
)

export const families = pgTable('families', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  primaryPersonId: integer('primary_person_id').references(() => people.id),
  status: text('status').notNull().default('activo'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const familyMembers = pgTable(
  'family_members',
  {
    id: serial('id').primaryKey(),
    familyId: integer('family_id')
      .notNull()
      .references(() => families.id),
    personId: integer('person_id')
      .notNull()
      .references(() => people.id),
    relationship: text('relationship'),
    validFrom: date('valid_from'),
    validTo: date('valid_to'),
    isPaymentResponsible: boolean('is_payment_responsible').notNull().default(false),
    canManageInApp: boolean('can_manage_in_app').notNull().default(false),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => [uniqueIndex('family_person_idx').on(t.familyId, t.personId)],
)

export const digitalAccounts = pgTable(
  'digital_accounts',
  {
    id: serial('id').primaryKey(),
    personId: integer('person_id')
      .notNull()
      .references(() => people.id),
    status: text('status').notNull().default('activo'),
    loginEmail: text('login_email'),
    passwordHash: text('password_hash'),
    emailVerified: boolean('email_verified').notNull().default(false),
    phoneVerified: boolean('phone_verified').notNull().default(false),
    lastLoginAt: timestamp('last_login_at'),
    passwordChangedAt: timestamp('password_changed_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex('digital_accounts_person_idx').on(t.personId),
    uniqueIndex('digital_accounts_email_idx').on(t.loginEmail),
  ],
)

// ============================================================
// USERS (admin del sistema de cuotas)
// ============================================================

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  username: text('username').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  fullName: text('full_name').notNull(),
  role: text('role').notNull(), // admin | cargador_pagos
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// ============================================================
// DISCIPLINAS / CATEGORÍAS / INSCRIPCIONES
// ============================================================

export const disciplinas = pgTable('disciplinas', {
  id: serial('id').primaryKey(),
  nombre: text('nombre').notNull(),
  activa: boolean('activa').notNull().default(true),
})

export const categoriasDeportivas = pgTable('categorias_deportivas', {
  id: serial('id').primaryKey(),
  disciplinaId: integer('disciplina_id')
    .notNull()
    .references(() => disciplinas.id),
  nombre: text('nombre').notNull(),
  edadDesde: integer('edad_desde'),
  edadHasta: integer('edad_hasta'),
  mesesCobro: jsonb('meses_cobro').notNull().$type<number[]>(),
  activa: boolean('activa').notNull().default(true),
})

export const inscripcionesDeportivas = pgTable('inscripciones_deportivas', {
  id: serial('id').primaryKey(),
  personId: integer('person_id')
    .notNull()
    .references(() => people.id),
  disciplinaId: integer('disciplina_id')
    .notNull()
    .references(() => disciplinas.id),
  categoriaDeportivaId: integer('categoria_deportiva_id')
    .notNull()
    .references(() => categoriasDeportivas.id),
  esHermano: boolean('es_hermano').notNull().default(false),
  esTercerHermano: boolean('es_tercer_hermano').notNull().default(false),
  esSegundoDeporte: boolean('es_segundo_deporte').notNull().default(false),
  fechaInicio: date('fecha_inicio').notNull(),
  fechaFin: date('fecha_fin'),
  activa: boolean('activa').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// ============================================================
// TARIFARIO
// ============================================================

export const tarifario = pgTable('tarifario', {
  id: serial('id').primaryKey(),
  tipoCuota: text('tipo_cuota').notNull(), // social | deportiva
  tipoSocioSocial: text('tipo_socio_social'),
  disciplinaId: integer('disciplina_id').references(() => disciplinas.id),
  categoriaDeportivaId: integer('categoria_deportiva_id').references(
    () => categoriasDeportivas.id,
  ),
  esHermano: boolean('es_hermano').notNull().default(false),
  esTercerHermano: boolean('es_tercer_hermano').notNull().default(false),
  esSegundoDeporte: boolean('es_segundo_deporte').notNull().default(false),
  monto: numeric('monto', { precision: 12, scale: 2 }).notNull(),
  vigenciaDesde: date('vigencia_desde').notNull(),
  vigenciaHasta: date('vigencia_hasta'),
  descripcion: text('descripcion'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// ============================================================
// CUOTAS (sobre Persona)
// ============================================================

export const cuotasGeneradas = pgTable(
  'cuotas_generadas',
  {
    id: serial('id').primaryKey(),
    personId: integer('person_id')
      .notNull()
      .references(() => people.id),
    membershipId: integer('membership_id').references(() => memberships.id),
    tipoCuota: text('tipo_cuota').notNull(), // social | deportiva
    disciplinaId: integer('disciplina_id').references(() => disciplinas.id),
    categoriaDeportivaId: integer('categoria_deportiva_id').references(
      () => categoriasDeportivas.id,
    ),
    periodo: text('periodo').notNull(), // YYYY-MM
    concepto: text('concepto').notNull(),
    montoOriginal: numeric('monto_original', { precision: 12, scale: 2 }).notNull(),
    montoFinal: numeric('monto_final', { precision: 12, scale: 2 }).notNull(),
    fechaVencimiento: date('fecha_vencimiento').notNull(),
    estado: text('estado').notNull().default('pendiente'), // pendiente | pagada | anulada
    generadaEn: timestamp('generada_en').defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex('cuota_unica_person_idx').on(
      t.personId,
      t.tipoCuota,
      t.disciplinaId,
      t.periodo,
    ),
  ],
)

// ============================================================
// MEDIOS DE PAGO / PAGOS
// ============================================================

export const mediosPago = pgTable('medios_pago', {
  id: serial('id').primaryKey(),
  nombre: text('nombre').notNull(),
  tipo: text('tipo').notNull(), // efectivo | transferencia | mercado_pago | debito_automatico
  alias: text('alias'),
  cbu: text('cbu'),
  datosPago: text('datos_pago'),
  activa: boolean('activa').notNull().default(true),
  orden: integer('orden').notNull().default(0),
})

export const pagos = pgTable('pagos', {
  id: serial('id').primaryKey(),
  personId: integer('person_id').references(() => people.id),
  familyId: integer('family_id').references(() => families.id),
  fechaPago: date('fecha_pago').notNull(),
  montoTotal: numeric('monto_total', { precision: 12, scale: 2 }).notNull(),
  medioPagoId: integer('medio_pago_id')
    .notNull()
    .references(() => mediosPago.id),
  referencia: text('referencia'),
  periodo: text('periodo'),
  observacion: text('observacion'),
  cargadoPor: integer('cargado_por').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const pagoCuotas = pgTable(
  'pago_cuotas',
  {
    id: serial('id').primaryKey(),
    pagoId: integer('pago_id')
      .notNull()
      .references(() => pagos.id),
    cuotaId: integer('cuota_id')
      .notNull()
      .references(() => cuotasGeneradas.id),
    montoAplicado: numeric('monto_aplicado', { precision: 12, scale: 2 }).notNull(),
  },
  (t) => [uniqueIndex('pago_cuota_idx').on(t.pagoId, t.cuotaId)],
)

// ============================================================
// AUDITORÍA GENERACIÓN DE CUOTAS
// ============================================================

export const generacionesCuotas = pgTable('generaciones_cuotas', {
  id: serial('id').primaryKey(),
  periodo: text('periodo').notNull(),
  ejecutadoPor: integer('ejecutado_por').references(() => users.id),
  cantidadPersonas: integer('cantidad_personas').notNull().default(0),
  cantidadCuotas: integer('cantidad_cuotas').notNull().default(0),
  cantidadErrores: integer('cantidad_errores').notNull().default(0),
  modo: text('modo').notNull().default('normal'),
  log: jsonb('log'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})