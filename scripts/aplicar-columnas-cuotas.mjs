import { getDatabase } from '@netlify/database'

const statements = [
  `ALTER TABLE people ADD COLUMN IF NOT EXISTS beca boolean NOT NULL DEFAULT false`,
  `ALTER TABLE memberships ADD COLUMN IF NOT EXISTS subcategoria_cuota text NOT NULL DEFAULT 'pleno'`,
  `ALTER TABLE inscripciones_deportivas ADD COLUMN IF NOT EXISTS subcategoria_cuota text NOT NULL DEFAULT 'pleno'`,
  `ALTER TABLE cuotas_generadas ADD COLUMN IF NOT EXISTS dni text`,
  `ALTER TABLE cuotas_generadas ADD COLUMN IF NOT EXISTS nombre_completo text`,
  `ALTER TABLE cuotas_generadas ADD COLUMN IF NOT EXISTS nro_socio text`,
  `ALTER TABLE cuotas_generadas ADD COLUMN IF NOT EXISTS subcategoria_cuota text`,
  `ALTER TABLE cuotas_generadas ADD COLUMN IF NOT EXISTS disciplina_nombre text`,
  `ALTER TABLE cuotas_generadas ADD COLUMN IF NOT EXISTS categoria_deportiva_nombre text`,
  `ALTER TABLE cuotas_generadas ADD COLUMN IF NOT EXISTS tarifario_id integer`,
]

async function main() {
  const db = getDatabase()
  const client = await db.pool.connect()
  try {
    for (const sql of statements) {
      console.log('Ejecutando:', sql.slice(0, 60) + '...')
      await client.query(sql)
    }
    console.log('Columnas aplicadas OK')
  } finally {
    client.release()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})