# syntax=docker/dockerfile:1

# ============================================================
# Kult - imagen única: la API (NestJS) sirve también el admin (SPA Vite).
# Multi-stage:
#   1) admin-build  -> compila el frontend admin (genera admin/dist)
#   2) api-build    -> compila la API (genera api/dist) + deps de producción
#   3) runner       -> imagen final: API + build del admin servido en /
# ============================================================

# ------------------------------------------------------------
# 1) Build del admin (frontend)
# ------------------------------------------------------------
FROM node:20-slim AS admin-build
WORKDIR /app/admin

# Instala dependencias con la lockfile para builds reproducibles.
COPY admin/package.json admin/package-lock.json ./
RUN npm ci

# Copia el código y construye. En producción el cliente llama a /api (mismo
# origen), así que NO se necesita VITE_API_URL.
COPY admin/ ./
RUN npm run build

# ------------------------------------------------------------
# 2) Build de la API (backend)
# ------------------------------------------------------------
FROM node:20-slim AS api-build
WORKDIR /app/api

COPY api/package.json api/package-lock.json ./
RUN npm ci

COPY api/ ./
RUN npm run build

# Deja solo las dependencias de producción para copiarlas al runner.
RUN npm prune --omit=dev

# ------------------------------------------------------------
# 3) Imagen final
# ------------------------------------------------------------
FROM node:20-slim AS runner
ENV NODE_ENV=production
WORKDIR /app

# Dependencias de producción y artefactos compilados de la API.
COPY --from=api-build /app/api/node_modules ./node_modules
COPY --from=api-build /app/api/dist ./dist
COPY --from=api-build /app/api/package.json ./package.json

# Build del admin: se copia a dist/client, que es la ruta por defecto que
# sirve ServeStaticModule (join(__dirname, '..', 'client') desde dist/).
COPY --from=admin-build /app/admin/dist ./dist/client

# EasyPanel enruta al puerto expuesto; la app escucha en PORT (default 3000).
EXPOSE 3000

# Arranque de la API de producción.
CMD ["node", "dist/main"]
