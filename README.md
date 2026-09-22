# Control de Cuotas — Club

Sistema de control de cuotas sociales y deportivas del club.

## Stack (mismo enfoque que el natatorio)

- **Netlify Database** (Postgres administrado)
- **Drizzle ORM**
- Autenticación por cookie de sesión
- React + Vite / TanStack
- Despliegue en Netlify

## Estructura

```
club-cuotas-netlify/
├── db/
│   ├── schema.ts          # Definición de todas las tablas
│   └── index.ts           # Cliente Drizzle
├── netlify/
│   └── database/
│       └── migrations/    # Migraciones generadas por drizzle-kit
├── src/
│   ├── lib/               # Utilidades y sesión
│   ├── server/            # Lógica de backend (server functions)
│   ├── components/
│   └── routes/            # Páginas
├── drizzle.config.ts
├── netlify.toml
└── package.json
```

## Desarrollo local

```bash
npm install
# o pnpm install

# Para desarrollo con base de datos real:
netlify dev
```

## Base de datos

El esquema está en `db/schema.ts`.

Para generar una migración después de cambiar el schema:

```bash
npx drizzle-kit generate --name nombre_del_cambio
```

Netlify aplica automáticamente las migraciones de `netlify/database/migrations/` al desplegar.

## Próximos pasos

1. Definir schema ✅
2. Configurar autenticación por cookie
3. Consulta pública por DNI / N° socio / grupo familiar
4. Panel de administración
5. Generación masiva de cuotas
6. Carga masiva de pagos (Excel)
