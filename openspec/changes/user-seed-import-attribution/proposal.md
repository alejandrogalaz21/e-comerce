# Proposal: user-seed-import-attribution (TK-030)

## Why

Gap de auditoría detectado en la revisión del pipeline: `import_batches` responde "qué, cuándo y
con qué resultado", pero no **quién**. En una fintech la trazabilidad incluye al actor. Además
resuelve TK-019: el módulo auth JWT (conservado como punto de extensión) pasa a uso activo.

## What Changes

- **BE**: migración que agrega `imported_by` (varchar nullable) a `import_batches`; el seed de
  arranque crea (idempotente) un **usuario admin** con password de env `SEED_ADMIN_PASSWORD`;
  `POST /products/import` queda protegido con el guard JWT existente y registra el email del
  usuario en el batch; el seed de catálogo firma como `seed`; los GET de batches exponen
  `importedBy` (lectura sigue pública).
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
