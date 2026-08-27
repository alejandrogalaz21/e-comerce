# Proposal: user-seed-import-attribution (TK-030)

## Why

Gap de auditoría detectado en la revisión del pipeline: `import_batches` responde "qué, cuándo y
con qué resultado", pero no **quién**. En una fintech la trazabilidad incluye al actor. Además
resuelve TK-019: el módulo auth JWT (conservado como punto de extensión) pasa a uso activo.

## What Changes

- **BE** (*alcance refinado por el usuario 2026-08-27*): la app arranca **sin datos de negocio**
  — el módulo `seed` y el CSV embebido se eliminan (el catálogo lo crea el usuario desde la UI).
  Una **migración de datos** idempotente crea el único registro sembrado: el usuario demo
  `demo@demo.com` / `demo` (datos ficticios, hash bcrypt). Fase 2 del ticket: `imported_by`
  (varchar nullable) en `import_batches`, `POST /products/import` protegido con el guard JWT y
  registrando el email del usuario; los GET de batches exponen `importedBy` (lectura pública).
  De pasada (evaluación de arquitectura, docs/03-be-arquitectura.md): `database/redis/` se movió
  a `src/redis/` — `database/` queda PostgreSQL-only.
- **FE**: `endpoints.auth` apuntado a las rutas reales (`/api/v1/auth/*`) y el contexto JWT del
  template conectado de verdad; la página de import exige sesión (CTA a sign-in si no hay);
  historial y detalle de batches muestran **Imported by**.
- **e2e**: los specs de import se autentican con el admin seed antes de subir.

## Non-goals

- Roles/permisos (cualquier usuario autenticado puede importar); registro de usuarios desde UI
  más allá del sign-up existente; proteger el resto del dashboard (sigue público por decisión
  del spec §10.2 — solo el import, que es la operación que muta en masa, exige identidad).

## Impact

`api/` (migración, entidad, guard en import controller, seed de usuario, .env.example),
`web/` (axios endpoints auth, vista de import, vistas de batches, e2e), README (credenciales
del admin de demo para el evaluador).
