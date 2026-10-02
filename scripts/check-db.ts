import pg from 'pg'

const { Client } = pg

async function main() {
  const u = new URL(process.env.NETLIFY_DB_URL!)
  u.pathname = '/postgres'

  const client = new Client({
    connectionString: u.toString(),
  })

  await client.connect()

  console.log('\n=== DISCIPLINAS ===')
  const disciplinas = await client.query(`
    SELECT id, nombre, activa
    FROM disciplinas
    ORDER BY id
  `)
  console.table(disciplinas.rows)

  console.log('\n=== CATEGORÍAS DEPORTIVAS ===')
  const categorias = await client.query(`
    SELECT
      c.id,
      d.nombre AS disciplina,
      c.nombre,
      c.edad_desde,
      c.edad_hasta,
      c.meses_cobro,
      c.activa
    FROM categorias_deportivas c
    JOIN disciplinas d ON d.id = c.disciplina_id
    ORDER BY d.id, c.id
  `)
  console.table(categorias.rows)

  console.log('\n=== CANTIDAD DE PERSONAS ===')
  const people = await client.query(`
    SELECT COUNT(*)::int AS cantidad
    FROM people
  `)
  console.table(people.rows)

  console.log('\n=== CANTIDAD DE MEMBRESÍAS ===')
  const memberships = await client.query(`
    SELECT COUNT(*)::int AS cantidad
    FROM memberships
  `)
  console.table(memberships.rows)

  await client.end()
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
