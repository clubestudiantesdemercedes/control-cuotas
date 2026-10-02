import pg from 'pg'

const { Client } = pg

type PersonaDemo = {
  dni: string
  nombre: string
  apellido: string
  nacimiento: string
  telefono?: string
  email?: string
  categoria: 'menor' | 'activo' | 'vitalicio'
}

const personas: PersonaDemo[] = [
  // Adultos
  { dni: '90000001', nombre: 'Juan', apellido: 'Gómez', nacimiento: '1982-04-15', telefono: '2324000001', email: 'juan.gomez.demo@example.com', categoria: 'activo' },
  { dni: '90000002', nombre: 'María', apellido: 'Fernández', nacimiento: '1985-08-22', telefono: '2324000002', email: 'maria.fernandez.demo@example.com', categoria: 'activo' },
  { dni: '90000003', nombre: 'Carlos', apellido: 'Rodríguez', nacimiento: '1978-01-10', telefono: '2324000003', categoria: 'activo' },
  { dni: '90000004', nombre: 'Laura', apellido: 'Martínez', nacimiento: '1990-11-03', telefono: '2324000004', email: 'laura.martinez.demo@example.com', categoria: 'activo' },
  { dni: '90000005', nombre: 'Pablo', apellido: 'López', nacimiento: '1987-06-18', telefono: '2324000005', categoria: 'activo' },
  { dni: '90000006', nombre: 'Andrea', apellido: 'Sánchez', nacimiento: '1992-02-27', email: 'andrea.sanchez.demo@example.com', categoria: 'activo' },
  { dni: '90000007', nombre: 'Diego', apellido: 'Díaz', nacimiento: '1980-09-12', telefono: '2324000007', categoria: 'activo' },
  { dni: '90000008', nombre: 'Carolina', apellido: 'Pérez', nacimiento: '1988-12-05', telefono: '2324000008', email: 'carolina.perez.demo@example.com', categoria: 'activo' },
  { dni: '90000009', nombre: 'Martín', apellido: 'Romero', nacimiento: '1975-03-29', telefono: '2324000009', categoria: 'activo' },
  { dni: '90000010', nombre: 'Gabriela', apellido: 'Torres', nacimiento: '1983-07-14', email: 'gabriela.torres.demo@example.com', categoria: 'activo' },

  { dni: '90000011', nombre: 'Fernando', apellido: 'Ruiz', nacimiento: '1972-05-21', telefono: '2324000011', categoria: 'activo' },
  { dni: '90000012', nombre: 'Silvia', apellido: 'Ramírez', nacimiento: '1979-10-08', telefono: '2324000012', email: 'silvia.ramirez.demo@example.com', categoria: 'activo' },
  { dni: '90000013', nombre: 'Nicolás', apellido: 'Vega', nacimiento: '1991-01-19', telefono: '2324000013', categoria: 'activo' },
  { dni: '90000014', nombre: 'Paola', apellido: 'Castro', nacimiento: '1986-04-30', email: 'paola.castro.demo@example.com', categoria: 'activo' },
  { dni: '90000015', nombre: 'Sebastián', apellido: 'Morales', nacimiento: '1984-08-17', telefono: '2324000015', categoria: 'activo' },
  { dni: '90000016', nombre: 'Verónica', apellido: 'Ortiz', nacimiento: '1977-12-11', telefono: '2324000016', email: 'veronica.ortiz.demo@example.com', categoria: 'activo' },
  { dni: '90000017', nombre: 'Ricardo', apellido: 'Herrera', nacimiento: '1968-02-06', telefono: '2324000017', categoria: 'activo' },
  { dni: '90000018', nombre: 'Patricia', apellido: 'Navarro', nacimiento: '1974-06-25', email: 'patricia.navarro.demo@example.com', categoria: 'activo' },
  { dni: '90000019', nombre: 'Alejandro', apellido: 'Molina', nacimiento: '1989-09-01', telefono: '2324000019', categoria: 'activo' },
  { dni: '90000020', nombre: 'Marcela', apellido: 'Suárez', nacimiento: '1981-11-23', telefono: '2324000020', email: 'marcela.suarez.demo@example.com', categoria: 'activo' },

  // Vitalicios
  { dni: '90000021', nombre: 'Roberto', apellido: 'Sosa', nacimiento: '1948-03-12', telefono: '2324000021', email: 'roberto.sosa.demo@example.com', categoria: 'vitalicio' },
  { dni: '90000022', nombre: 'Elena', apellido: 'Acosta', nacimiento: '1952-07-09', telefono: '2324000022', categoria: 'vitalicio' },

  // Más adultos
  { dni: '90000023', nombre: 'Jorge', apellido: 'Benítez', nacimiento: '1993-05-16', telefono: '2324000023', categoria: 'activo' },
  { dni: '90000024', nombre: 'Natalia', apellido: 'Méndez', nacimiento: '1988-01-28', email: 'natalia.mendez.demo@example.com', categoria: 'activo' },
  { dni: '90000025', nombre: 'Gustavo', apellido: 'Ponce', nacimiento: '1976-10-04', telefono: '2324000025', categoria: 'activo' },
  { dni: '90000026', nombre: 'Lorena', apellido: 'Ríos', nacimiento: '1984-03-20', telefono: '2324000026', email: 'lorena.rios.demo@example.com', categoria: 'activo' },
  { dni: '90000027', nombre: 'Marcelo', apellido: 'Cabrera', nacimiento: '1982-12-19', telefono: '2324000027', categoria: 'activo' },
  { dni: '90000028', nombre: 'Claudia', apellido: 'Farias', nacimiento: '1990-06-07', email: 'claudia.farias.demo@example.com', categoria: 'activo' },
  { dni: '90000029', nombre: 'Daniel', apellido: 'Ferreyra', nacimiento: '1971-09-26', telefono: '2324000029', categoria: 'activo' },
  { dni: '90000030', nombre: 'Valeria', apellido: 'Ibarra', nacimiento: '1987-02-14', telefono: '2324000030', categoria: 'activo' },

  // Menores
  { dni: '90000031', nombre: 'Mateo', apellido: 'Gómez', nacimiento: '2019-05-12', categoria: 'menor' },
  { dni: '90000032', nombre: 'Sofía', apellido: 'Fernández', nacimiento: '2018-08-21', categoria: 'menor' },
  { dni: '90000033', nombre: 'Benjamín', apellido: 'Rodríguez', nacimiento: '2017-02-18', categoria: 'menor' },
  { dni: '90000034', nombre: 'Emma', apellido: 'Martínez', nacimiento: '2016-11-04', categoria: 'menor' },
  { dni: '90000035', nombre: 'Thiago', apellido: 'López', nacimiento: '2015-06-23', categoria: 'menor' },
  { dni: '90000036', nombre: 'Martina', apellido: 'Sánchez', nacimiento: '2014-03-15', categoria: 'menor' },
  { dni: '90000037', nombre: 'Tomás', apellido: 'Díaz', nacimiento: '2013-09-08', categoria: 'menor' },
  { dni: '90000038', nombre: 'Catalina', apellido: 'Pérez', nacimiento: '2012-12-17', categoria: 'menor' },
  { dni: '90000039', nombre: 'Franco', apellido: 'Romero', nacimiento: '2011-04-26', categoria: 'menor' },
  { dni: '90000040', nombre: 'Valentina', apellido: 'Torres', nacimiento: '2010-07-13', categoria: 'menor' },

  { dni: '90000041', nombre: 'Santino', apellido: 'Ruiz', nacimiento: '2009-01-31', categoria: 'menor' },
  { dni: '90000042', nombre: 'Julieta', apellido: 'Ramírez', nacimiento: '2008-10-22', categoria: 'menor' },
  { dni: '90000043', nombre: 'Lautaro', apellido: 'Vega', nacimiento: '2020-02-11', categoria: 'menor' },
  { dni: '90000044', nombre: 'Olivia', apellido: 'Castro', nacimiento: '2021-06-19', categoria: 'menor' },
  { dni: '90000045', nombre: 'Benicio', apellido: 'Morales', nacimiento: '2022-03-27', categoria: 'menor' },
  { dni: '90000046', nombre: 'Renata', apellido: 'Ortiz', nacimiento: '2019-11-05', categoria: 'menor' },
  { dni: '90000047', nombre: 'Valentín', apellido: 'Herrera', nacimiento: '2018-04-14', categoria: 'menor' },
  { dni: '90000048', nombre: 'Ambar', apellido: 'Navarro', nacimiento: '2017-08-30', categoria: 'menor' },
  { dni: '90000049', nombre: 'Máximo', apellido: 'Molina', nacimiento: '2016-01-16', categoria: 'menor' },
  { dni: '90000050', nombre: 'Mía', apellido: 'Suárez', nacimiento: '2015-10-09', categoria: 'menor' },

  { dni: '90000051', nombre: 'Agustín', apellido: 'Benítez', nacimiento: '2014-05-25', categoria: 'menor' },
  { dni: '90000052', nombre: 'Josefina', apellido: 'Méndez', nacimiento: '2013-02-07', categoria: 'menor' },
  { dni: '90000053', nombre: 'Simón', apellido: 'Ponce', nacimiento: '2012-09-18', categoria: 'menor' },
  { dni: '90000054', nombre: 'Delfina', apellido: 'Ríos', nacimiento: '2011-12-02', categoria: 'menor' },
  { dni: '90000055', nombre: 'Ignacio', apellido: 'Cabrera', nacimiento: '2010-06-16', categoria: 'menor' },
  { dni: '90000056', nombre: 'Lola', apellido: 'Farias', nacimiento: '2009-03-29', categoria: 'menor' },
  { dni: '90000057', nombre: 'Bautista', apellido: 'Ferreyra', nacimiento: '2008-08-12', categoria: 'menor' },
  { dni: '90000058', nombre: 'Isabella', apellido: 'Ibarra', nacimiento: '2020-10-24', categoria: 'menor' },
  { dni: '90000059', nombre: 'Facundo', apellido: 'García', nacimiento: '2007-05-11', categoria: 'menor' },
  { dni: '90000060', nombre: 'Agustina', apellido: 'Navarro', nacimiento: '2006-09-03', categoria: 'menor' },
]

const categoriasFutbol = [
  { nombre: '2015', edadDesde: 11, edadHasta: 11 },
  { nombre: '2014', edadDesde: 12, edadHasta: 12 },
  { nombre: '2013', edadDesde: 13, edadHasta: 13 },
  { nombre: '2012', edadDesde: 14, edadHasta: 14 },
  { nombre: '2011', edadDesde: 15, edadHasta: 15 },
  { nombre: '2010', edadDesde: 16, edadHasta: 16 },
  { nombre: '2009', edadDesde: 17, edadHasta: 17 },
  { nombre: '2008', edadDesde: 18, edadHasta: 18 },
  { nombre: 'Reserva', edadDesde: null, edadHasta: null },
  { nombre: 'Primera', edadDesde: null, edadHasta: null },
]

async function main() {
  if (!process.env.NETLIFY_DB_URL) {
    throw new Error('NETLIFY_DB_URL no está configurada.')
  }

  const u = new URL(process.env.NETLIFY_DB_URL)
  u.pathname = '/postgres'

  const client = new Client({
    connectionString: u.toString(),
  })

  await client.connect()
  await client.query('BEGIN')

  try {
    // ----------------------------------------------------------
    // 1. Completar categorías de fútbol
    // ----------------------------------------------------------
    const disciplina = await client.query(
      "SELECT id FROM disciplinas WHERE nombre = 'Fútbol' LIMIT 1"
    )

    if (disciplina.rows.length === 0) {
      throw new Error('No existe la disciplina Fútbol.')
    }

    const futbolId = disciplina.rows[0].id

    let categoriasCreadas = 0

    for (const categoria of categoriasFutbol) {
      const existente = await client.query(
        `SELECT id
         FROM categorias_deportivas
         WHERE disciplina_id = $1 AND nombre = $2
         LIMIT 1`,
        [futbolId, categoria.nombre]
      )

      if (existente.rows.length === 0) {
        await client.query(
          `INSERT INTO categorias_deportivas
           (disciplina_id, nombre, edad_desde, edad_hasta, meses_cobro, activa)
           VALUES ($1, $2, $3, $4, $5, true)`,
          [
            futbolId,
            categoria.nombre,
            categoria.edadDesde,
            categoria.edadHasta,
            JSON.stringify([3, 4, 5, 6, 7, 8, 9, 10, 11, 12]),
          ]
        )

        categoriasCreadas++
      }
    }

    // ----------------------------------------------------------
    // 2. Obtener próximo número de socio
    // ----------------------------------------------------------
    const ultimoNumero = await client.query(`
      SELECT COALESCE(
        MAX(
          CASE
            WHEN member_number ~ '^[0-9]+$'
            THEN member_number::integer
            ELSE 0
          END
        ),
        0
      ) AS ultimo
      FROM memberships
    `)

    let siguienteNumero = Number(ultimoNumero.rows[0].ultimo) + 1

    let personasCreadas = 0
    let membresiasCreadas = 0
    let personasExistentes = 0

    // ----------------------------------------------------------
    // 3. Crear personas y membresías
    // ----------------------------------------------------------
    for (const persona of personas) {
      const existente = await client.query(
        `SELECT id
         FROM people
         WHERE document_type = 'DNI'
           AND document_number = $1
         LIMIT 1`,
        [persona.dni]
      )

      let personId: number

      if (existente.rows.length > 0) {
        personId = existente.rows[0].id
        personasExistentes++
      } else {
        const insertPersona = await client.query(
          `INSERT INTO people
           (
             document_type,
             document_number,
             first_name,
             last_name,
             birth_date,
             status,
             phone,
             email,
             record_source,
             notes
           )
           VALUES
           (
             'DNI',
             $1,
             $2,
             $3,
             $4,
             'activo',
             $5,
             $6,
             'demo',
             'Persona de demostración'
           )
           RETURNING id`,
          [
            persona.dni,
            persona.nombre,
            persona.apellido,
            persona.nacimiento,
            persona.telefono ?? null,
            persona.email ?? null,
          ]
        )

        personId = insertPersona.rows[0].id
        personasCreadas++
      }

      // Evitar duplicar la membresía si se ejecuta nuevamente.
      const membresiaExistente = await client.query(
        `SELECT id
         FROM memberships
         WHERE person_id = $1
           AND status = 'activo'
         LIMIT 1`,
        [personId]
      )

      if (membresiaExistente.rows.length === 0) {
        await client.query(
          `INSERT INTO memberships
           (
             person_id,
             member_number,
             category,
             status,
             start_date,
             notes
           )
           VALUES
           (
             $1,
             $2,
             $3,
             'activo',
             '2026-01-01',
             'Membresía de demostración'
           )`,
          [
            personId,
            String(siguienteNumero),
            persona.categoria,
          ]
        )

        siguienteNumero++
        membresiasCreadas++
      }
    }

    await client.query('COMMIT')

    console.log('')
    console.log('========================================')
    console.log('      CARGA DEMO FINALIZADA')
    console.log('========================================')
    console.log(`Categorías de fútbol creadas: ${categoriasCreadas}`)
    console.log(`Personas nuevas:              ${personasCreadas}`)
    console.log(`Personas ya existentes:       ${personasExistentes}`)
    console.log(`Membresías nuevas:            ${membresiasCreadas}`)
    console.log('========================================')
    console.log('')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    await client.end()
  }
}

main().catch((error) => {
  console.error('')
  console.error('ERROR DURANTE LA CARGA:')
  console.error(error)
  process.exit(1)
})


