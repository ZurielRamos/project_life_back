# Despliegue (EasyPanel · Docker)

La API de NestJS sirve también el panel admin (SPA de React/Vite). Una sola
imagen, un solo puerto: el admin se sirve en `/` y la API bajo `/api`.

## Arquitectura

- `Dockerfile` (raíz): build multi-stage.
  1. **admin-build**: compila `admin/` → `admin/dist`.
  2. **api-build**: compila `api/` → `api/dist` y deja solo dependencias de producción.
  3. **runner**: imagen final. Copia `api/dist` + `node_modules` y pone el
     build del admin en `dist/client`.
- En runtime, `ServeStaticModule` sirve `dist/client` en `/` con fallback a
  `index.html` (para las rutas de React Router) y **excluye `/api*`** para no
  pisar la API.
- El cliente llama a `/api` en el mismo origen (no se necesita `VITE_API_URL`
  ni CORS en producción).

## Puerto

La app escucha en `PORT` (por defecto `3000`). En EasyPanel apunta el proxy a
ese puerto.

## Variables de entorno

Configúralas en EasyPanel (no se hornean en la imagen). Ver `api/.env.example`
para la lista completa. Mínimas para producción:

- `NODE_ENV=production`
- `PORT=3000`
- Base de datos: `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_NAME`,
  `DB_SSL` (según tu Postgres), `DB_SYNCHRONIZE` (ver nota abajo)
- Redis (cola BullMQ): `REDIS_HOST`, `REDIS_PORT`, `REDIS_USERNAME`, `REDIS_PASSWORD`
- Auth: `JWT_SECRET`, `JWT_EXPIRES_IN`
- Seed admin: `ADMIN_EMAIL`, `ADMIN_PASSWORD`
- SudoMock: `SUDOMOCK_API_KEY` o `SUDOMOCK_ACCOUNTS`
- Cloudinary: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
- IA/SEO: `OPENROUTER_API_KEY`, `OPENROUTER_TEXT_MODEL`, `OPENROUTER_EMBEDDING_MODEL`
- Marca/SEO: `BRAND_NAME`, `SITE_URL`

`CLIENT_DIST_PATH` NO hace falta: por defecto es `dist/client`, donde el
Dockerfile deja el admin.

## Esquema de base de datos

- `DB_SYNCHRONIZE=true` crea/actualiza las tablas automáticamente al arrancar.
  Útil para el primer despliegue. En producción estable conviene ponerlo en
  `false` y gestionar cambios con cuidado.
- La extensión `pgvector` debe estar instalada en la base (para la búsqueda
  semántica): `CREATE EXTENSION IF NOT EXISTS vector;`.

## Seed (usuario admin + permisos)

Una vez desplegado, ejecuta el seed dentro del contenedor:

```
npm run seed:prod
```

(equivale a `node dist/database/seed/seed.js`). Usa `ADMIN_EMAIL` /
`ADMIN_PASSWORD` del entorno.

## Build local (opcional)

```
docker build -t kult .
docker run --env-file api/.env -p 3000:3000 kult
```

Luego abre `http://localhost:3000` (admin) — la API responde en
`http://localhost:3000/api`.

## Dominios propios de las tiendas

Cada tienda puede tener varios dominios/subdominios propios. La API los
registra en el proyecto de Vercel del **front** (Vercel enruta y emite/renueva
el certificado TLS automáticamente) y vigila su estado con un job de BullMQ
(cada 60 s mientras estén pendientes).

Variables de la API:

- `VERCEL_API_TOKEN`: token con acceso al proyecto del front.
- `VERCEL_PROJECT_ID`: id o nombre del proyecto del front.
- `VERCEL_TEAM_ID`: solo si el proyecto pertenece a un equipo.

Los registros DNS que debe crear el cliente se muestran en el admin
(Tienda → Dominio): `A 76.76.21.21` para el dominio raíz o `CNAME` para
subdominios (los valores exactos los devuelve Vercel). Un dominio queda
"Activo" cuando Vercel confirma los DNS; "SSL emitido" cuando HTTPS responde
con un certificado válido. El `stores.domain` antiguo se migra solo a la
tabla `store_domains` al arrancar.
