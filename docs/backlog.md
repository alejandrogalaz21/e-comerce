# Backlog de tickets

> Fuente de verdad del trabajo del proyecto. Cada ticket se implementa como un **OpenSpec change**
> (`/opsx:propose TK-###`): el workflow lee este documento, toma el contexto del ticket, y al
> archivar el change el ticket pasa a `closed` con el enlace al change.
>
> **Categorías**: `requerimiento` = pedido explícito del challenge (PDF) · `técnico` = modificación
> del proyecto necesaria/deuda que no es un requerimiento del challenge.
>
> Convención: el nombre del OpenSpec change es el slug del ticket (ej. TK-007 → `products-crud`).

| # | Título | Categoría | Descripción / contexto | Estatus | OpenSpec change |
|---|---|---|---|---|---|
| TK-001 | Baseline y control de versiones | técnico | Commit inicial de los templates `api/` y `web/` + spec previo (`docs/initial.md`) para poder recuperar cualquier archivo borrado durante la limpieza. | closed | — (pre-OpenSpec) |
| TK-002 | Instalar OpenSpec a nivel proyecto | técnico | Workflow spec-driven ([openspec.dev](https://openspec.dev/)) con comandos `/opsx:*` y skills en `.claude/`, artefactos en español. Todas las features nuevas pasan por propose → apply → archive. | closed | — (pre-OpenSpec) |
| TK-003 | Análisis de templates base | técnico | Auditoría de `api/` (NestJS+TypeORM contaminado con dominio fiscal SAT) y `web/` (Minimals UI Kit v6 full). Veredicto de reutilización documentado en [02-analisis-base.md](02-analisis-base.md). | closed | — (pre-OpenSpec) |
| TK-004 | Poda del backend | técnico | Eliminar módulos fiscales, DynamoDB, integraciones (Twilio/OpenAI/Google), código muerto y 10 deps. Arreglos: Dockerfile roto (yarn→npm ci), swagger v11→v7, JWT via ConfigService, flags `DB_SSL`/`DB_SYNC`, moduleNameMapper de Jest. | closed | — (pre-OpenSpec) |
| TK-005 | Poda del frontend | técnico | De ~1334 a 500 archivos: solo product/checkout/order/error/address + auth JWT + componentes genéricos. −28 deps (−420 paquetes). Dockerfile nginx SPA creado. Puerto dev 8080→3000. | closed | — (pre-OpenSpec) |
| TK-006 | Ambiente Docker + desarrollo local | requerimiento | `docker-compose.yml` único en raíz: db (Postgres 16, healthcheck) + api (4000→8080, prefijo `api/v1`) + web (3000→nginx 80). Verificado FE→BE→DB. Flujo local manual documentado en README. | closed | — (pre-OpenSpec) |
| TK-007 | CRUD de productos alineado al contrato CSV | requerimiento | La entidad actual (`title`, `slug`, `sizes`, `gender`, precio `float`) no coincide con el CSV del challenge. Rediseñar a `sku` (UNIQUE), `name`, `description`, `category` (default "Uncategorized"), `price DECIMAL(10,2)`, `stock` int ≥0, `weight_kg DECIMAL` nullable. Implementar `update()`/`remove()` (hoy son stubs) + `@ApiProperty` en DTOs. Referencia: initial.md §3. | open | |
| TK-008 | Búsqueda de productos | requerimiento | `findAll` no acepta filtros. Añadir `?q=` (ILIKE sobre name/description/sku), filtro por categoría, rango de precio, orden whitelisted, sobre la paginación existente (`PAGINATION_GUIDE.md`). Índices adecuados. Referencia: initial.md §6 (CQS ligero). | open | |
| TK-009 | Importación CSV con validación por capas | requerimiento | No existe nada: instalar multer + `csv-parse`. Endpoint `POST /products/import`, validación por capas (initial.md §4.5), import parcial (no todo-o-nada), upsert por SKU (insert / no-op / update+warning), tabla `import_batches` con contadores y reporte por fila. El CSV de ejemplo trae XSS (línea 20), SQLi (29), precios inválidos ($29.99, "free"), stock −5, filas vacías, duplicados de SKU — cada caso con decisión documentada en initial.md §1. | open | |
| TK-010 | Órdenes transaccionales con control de stock | requerimiento | Reescribir orders sobre Postgres (el de DynamoDB se eliminó): entidades `Order`/`OrderItem` con `unit_price_snapshot`, transacción con `SELECT ... FOR UPDATE` (initial.md §5), `total` recalculado en servidor, `idempotency_key` UNIQUE, fake payment con patrón Strategy (`PaymentProvider` → `FakePaymentProvider`), 409 si no hay stock. | open | |
| TK-011 | Integración FE ↔ API real | requerimiento | El front aún llama a las rutas del mock Minimals (`/api/product/list` → 404). Alinear `endpoints` en `src/utils/axios.ts` a `api/v1/*`, añadir mutaciones reales (create/update/delete con `mutate` de SWR — hoy el submit es `setTimeout`+toast), recortar `IProductItem` al contrato real, paginación server-side en el DataGrid, checkout con POST real a `/orders`, quitar imports de `src/_mock`. Proxy `/api` en Vite para dev. | open | |
| TK-012 | Seed automático vía pipeline de import | requerimiento | Al levantar docker, el api debe importar el CSV de ejemplo **a través del pipeline de import real** (así el seed prueba el import end-to-end, initial.md §10.3). Cero pasos manuales para ver datos. Depende de TK-009. | open | |
| TK-013 | Migraciones TypeORM reales | técnico | Hoy el schema se crea con `DB_SYNC=true` (temporal). Crear `data-source.ts`, carpeta `migrations/`, scripts npm, correr migraciones al iniciar el contenedor, y apagar `DB_SYNC`. Idealmente junto con TK-007 (el schema nuevo nace como migración). | open | |
| TK-014 | Exception filter global + contrato de errores | técnico | `handleDBExceptions` está copiado en cada servicio. Crear `common/filters` con el shape de error consistente de initial.md §7 (`statusCode`, `error`, `message`, `path`, `timestamp`). | open | |
| TK-015 | Hardening de seguridad | técnico | `helmet`, rate limiting (`@nestjs/throttler`) en import, CORS explícito al origin del web (hoy `*`), sanitización anti-XSS de `name`/`description` en el DTO de import (el escape de React no basta como única defensa). Referencia: initial.md §8, §10.6. | open | |
| TK-016 | Estrategia de tests | técnico | Cobertura actual 0%. Prioridad: unitarios del pipeline de validación CSV (casos reales del archivo), concurrencia de stock (dos compras del último ítem), e2e import→search→order. FE: Vitest + Testing Library si el tiempo alcanza. | open | |
| TK-017 | README final de entrega | requerimiento | El challenge pide: decisiones/approach/alternativas consideradas, fecha de descarga del CSV (2026-08-26 ✅ ya está), instrucciones de ejecución, y quitar comentarios del código generado con AI. Revisión final pre-entrega. | open | |
| TK-018 | Decidir: licencia del template Minimals | técnico | El FE deriva de Minimals UI Kit (template comercial de pago). Si el repo de entrega será público en GitHub, revisar términos de la licencia o mencionarlo en el README. **Decisión del usuario pendiente.** | open | |
| TK-019 | Decidir: conservar o eliminar auth/users del API | técnico | El challenge no pide auth (initial.md §10.2). Se conservaron `auth/` y `users/` como punto de extensión funcional. Alternativa: eliminarlos para un repo más minimal. **Decisión del usuario pendiente.** | open | |

## Flujo de trabajo

1. Tomar un ticket `open` → `/opsx:propose TK-### <slug>` (el workflow lee este documento).
2. Revisar proposal/specs/design/tasks generados en `openspec/changes/<slug>/`.
3. `/opsx:apply` para implementar → commits referenciando el ticket (`feat: ... (TK-009)`).
4. `/opsx:archive` al terminar → marcar aquí `closed` y enlazar el change archivado.

Orden sugerido: TK-007 → TK-013 → TK-008 → TK-009 → TK-014/015 → TK-010 → TK-011 → TK-012 → TK-016 → TK-017.
