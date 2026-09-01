# Estrategia de pruebas

Qué se prueba, a qué nivel, y — más útil aún — **qué no se prueba a propósito**.

El ticket del backlog que originó esto (TK-016) se escribió cuando la cobertura era 0%. Hoy son
**222 tests unitarios de API, 108 unitarios de web, 48 tests de navegador con Playwright y 5 e2e de
API**, más ocho casos manuales. Este documento explica la forma que tomaron.

Cada caso está enumerado en [MATRIX.md](MATRIX.md): propósito, pasos y resultado esperado, una fila
por caso de uso.

## El principio

**Un test se gana su sitio si puede fallar por un motivo real.** Un test que afirma que se llamó a
un mock demuestra que el código llama a un mock. Donde la garantía vive en Postgres — bloqueo de
filas, restricciones únicas, claves foráneas — el test corre contra una base de datos real, porque
un repositorio mockeado solo puede afirmar que el código *dice* `FOR UPDATE`, nunca que funciona.

Esa única decisión explica casi toda la estructura de abajo.

## Los niveles

| Nivel | Corre contra | Comando | Cantidad |
|---|---|---|---|
| **Unitario** | Mocks | `npm test` en `api/` | ~208 |
| **Integración (fixture real)** | El CSV del challenge de 97 filas, con repositorios mockeados | `npm test` | 7 |
| **Integración (base de datos real)** | Postgres en `:5432`, se omite si no está | `npm test` | 7 |
| **e2e de API** | El stack HTTP real vía supertest, se omite sin base de datos | `npm run test:e2e` en `api/` | 5 |
| **Unitario de frontend** | Funciones puras, sin jsdom | `npm test` en `web/` | 108 |
| **e2e de navegador** | El stack Docker completo, conducido por Playwright | `npm run test:e2e` en `web/` | 48 |
| **Manual** | El stack Docker completo | [docs/testing/](.) | 8 casos |

`npm test` pasa con o sin Docker levantado. Los specs que dependen de la base detectan su ausencia y
se omiten con un mensaje en lugar de fallar, de modo que quien revise ejecutando solo la suite
unitaria igual obtiene una ejecución verde.

## Qué cubre cada suite

### Unitarios de API — 222 tests

| Suite | Tests | Qué protege |
|---|---|---|
| `products.service.spec.ts` | 35 | Construcción de consultas, filtros, orden, manejo de decimales |
| `import.service.spec.ts` | 25 | Validación fila a fila con los casos reales del archivo de muestra |
| `create-product.dto.spec.ts` | 19 | Cada regla de campo, incluido el rechazo de HTML |
| `product-filters.dto.spec.ts` | 18 | Transformación de parámetros, límites, validación cruzada de precios |
| `orders.service.spec.ts` | 15 | Lógica de compra: totales, snapshots, idempotencia, manejo de rechazos |
| `http-exception.filter.spec.ts` | 13 | El sobre de error, resolución de códigos, sin fugas |
| `import.hardening.spec.ts` | 13 | Archivos malformados, vacíos, sobredimensionados y de tipo incorrecto |
| `import.attribution.spec.ts` | 11 | Quién ejecutó una importación |
| `database-error.translator.spec.ts` | 8 | Códigos de Postgres → HTTP, una sola traducción para todos los módulos |
| `import.integration.spec.ts` | 7 | El CSV real de 97 filas de punta a punta |
| `orders.concurrency.spec.ts` | 7 | **Postgres real**: bloqueo, orden anti-deadlock, rollback, negativa de la FK |
| `jwt-auth.guard.spec.ts` | 6 | Comportamiento fail-closed y la salida `@Public()` |
| `security.spec.ts` | 6 | CORS nunca resuelve a `*`; la importación lleva un límite de tasa estricto |
| `fake-payment.provider.spec.ts` | 4 | Aprobar, rechazar, determinismo con fuente fija, la tasa de ~10% |
| `products.controller.spec.ts` | 4 | Cableado y códigos de estado |
| `route-protection.spec.ts` | 3 | Qué endpoints son públicos y cuáles no |

### Unitarios de web — 108 tests

Solo funciones puras: ida y vuelta del estado en la URL, mappers, esquemas, manejo del token, la
regla de la clave de idempotencia. No hay React Testing Library ni jsdom en el proyecto, así que los
componentes no se renderizan en tests — ver **Huecos** abajo.

| Suite | Tests | Qué protege |
|---|---|---|
| `product-list-params.test.ts` | 28 | Todo el estado de la vista sobreviviendo en la URL |
| `product-schema.test.ts` | 18 | Reglas de cliente que reflejan el DTO del servidor |
| `import-utils.test.ts` | 13 | Vocabulario de estados, forma del reporte |
| `auth-token.test.ts` | 13 | Almacenamiento del token, expiración |
| `purchase.mapper.test.ts` | 8 | El contrato de compra y la clasificación de errores |
| `product.mapper.test.ts` | 7 | Cadenas decimales → números en el borde de render |
| `error.test.ts` | 7 | Manejo de errores de autenticación |
| `server-errors.test.ts` | 5 | Validación de servidor mapeada sobre los campos del formulario |
| `idempotency-key.test.ts` | 4 | Acuñar al entrar, conservar después |

### End to end de navegador — 48 tests de Playwright

Conducidos contra el stack en marcha, con un solo worker (los specs comparten base de datos y el
spec de importación reinicia la tabla de productos).

| Suite | Tests | Qué protege |
|---|---|---|
| `product-filters.spec.ts` | 8 | Orden a través del catálogo, chips, recarga y atrás, anchos recordados |
| `auth-session.spec.ts` | 7 | Redirecciones, volver a la ruta pedida, recarga, logout, la tienda pública |
| `products-crud.spec.ts` | 5 | Crear, editar, borrar por el diálogo de confirmación, la grilla de tienda |
| `product-csv-cases.spec.ts` | 6 | Las filas problemáticas del CSV de muestra, ejercitadas por el formulario real |
| `import-batch-search.spec.ts` | 4 | Encontrar un lote por nombre de archivo, sin distinguir mayúsculas |
| `product-import.spec.ts` | 4 | Subir el CSV real del challenge y ver el reporte |
| `product-import-batches.spec.ts` | 3 | Listado de historial y detalle del lote |
| `product-search.spec.ts` | 2 | Búsqueda en servidor y su estado vacío |
| `purchase.spec.ts` | 8 | El checkout completo: compra, rechazo forzado, conflicto de stock, doble clic en vuelo, comprador anónimo |

`product-csv-cases.spec.ts` es el interesante: toma las filas genuinamente hostiles del archivo del
challenge — la carga `<script>`, el sku con inyección SQL, el nombre de solo espacios — y las
conduce por el formulario real, demostrando que la defensa aguanta donde un usuario la encontraría.

### End to end de API — 5 tests

`test/app.e2e-spec.ts`, vía supertest. Lo que aporta sobre las suites unitarias es el **stack HTTP
real**: el pipe global y el filtro de excepciones corriendo de verdad sobre una petición, cosa que
ningún mock puede mostrar.

## Los tests que más importan

Si vas a leer cuatro, lee estos — cubren comportamiento que sale caro equivocar.

**`orders.concurrency.spec.ts` — dos compradores, una unidad.** Base de datos real. Dispara dos
compras simultáneas del último ítem y afirma que exactamente una tiene éxito y que el stock aterriza
en cero, jamás en `-1`. Cubre además el caso de interbloqueo que `initial.md` §5 no contempla: dos
pedidos que listan los mismos productos en secuencia opuesta.

**`orders.service.spec.ts` — el total se suma en céntimos enteros.** Usa precios que se rompen en
coma flotante binaria y afirma que el total es exacto al céntimo.

**`import.integration.spec.ts` — el archivo real de 97 filas.** Afirma la cubeta exacta en la que
cae cada fila. Es el test que atrapó el bug TK-047: había *codificado* el defecto, esperando que las
filas rechazadas llegaran sin nombre.

**`fake-payment.provider.spec.ts` — determinismo con fuente fija.** El proveedor rechaza ~10% de los
cobros a propósito, y esto demuestra que la aleatoriedad es inyectable para que ningún otro test
dependa de la suerte.

## Qué no se prueba, deliberadamente

Declarar esto es el sentido de un documento de estrategia; una lista de lo que existe es solo un
informe.

| No se prueba | Por qué |
|---|---|
| **Componentes React aislados** | No hay jsdom ni Testing Library en el proyecto. El comportamiento de componentes se cubre donde realmente importa — en un navegador real, con los specs de Playwright — en vez de en un DOM simulado. |
| **La tasa real de ~10% de rechazo en un navegador** | `purchase.spec.ts` fuerza un rechazo interceptando la respuesta, lo que lo mantiene determinista. La tasa se afirma sobre un barrido uniforme en `fake-payment.provider.spec.ts`, y observarla en la app en marcha queda manual ([TC-05](TC-05-purchase-flow.md), [TC-06](TC-06-concurrency-and-races.md)). |
| **El límite de tasa bajo carga real** | La configuración se afirma; disparar 300 peticiones en un test sería lento y demostraría poco. |
| **Las cabeceras individuales de Helmet** | Afirmar que una librería pone sus propias cabeceras es testear la librería. |
| **La caída de una dependencia a mitad de operación** | Parar un contenedor durante una transacción no se automatiza barato. Es el eje de [TC-06 · R9](TC-06-concurrency-and-races.md) y [TC-08](TC-08-status-and-degradation.md). |
| **El rollback de migraciones** | Verificado a mano al escribirlas; automatizarlo requiere una base desechable por ejecución. |

## Debilidades conocidas

- **Una suite unitaria de mocks puede alejarse de la realidad.** Se mitiga con las suites contra base
  real y contra fixture real, que es donde vive toda garantía que dependa de Postgres.
- **Los specs contra base de datos comparten la base de desarrollo.** Siembran filas con un prefijo
  `CONCURRENCY-TEST-` y las borran después. Una base de test dedicada sería más limpia; el prefijo
  es la versión pragmática.
- **No hay umbral de cobertura forzado en CI.** La cobertura está disponible con `npm run test:cov`,
  pero una puerta porcentual tiende a premiar tests escritos para subir un número.
- **Los casos manuales no tienen guarda de obsolescencia.** [TC-05](TC-05-purchase-flow.md) llegó a
  documentar un payload de `POST /orders` que la API ya rechazaba, porque el DTO endureció la clave
  de idempotencia y añadió la dirección de envío sin que nadie volviera al documento. Cuando cambie
  un contrato, `MATRIX.md` y los TC se revisan con él.

## Ejecutarlos

```bash
# API: unitarios + fixture + contra base de datos (los ultimos se omiten sin Postgres)
cd api && npm test

# API de punta a punta por el stack HTTP real (se omite sin base de datos)
cd api && npm run test:e2e

# Unitarios de web
cd web && npm test

# Navegador de punta a punta — necesita todo el stack levantado
docker compose up -d --build
cd web && npm run test:e2e

# Cobertura
cd api && npm run test:cov
```

Última ejecución completa, 2026-08-29: **222 + 5 + 108 + 48 = 383 tests automáticos, todos pasando.**

## Casos manuales

Los tests automáticos no pueden comprobar que una pantalla se lea bien, ni que un contenedor caído
degrade con elegancia. Los ocho casos de [docs/testing/](.) cubren lo que las suites no alcanzan:

| Caso | Qué cubre que lo automático no |
|---|---|
| [TC-01](TC-01-initial-import.md) – [TC-03](TC-03-unchanged-does-not-write.md) | El pipeline de importación contra el archivo real, con el reporte a la vista |
| [TC-04](TC-04-report-consistency-and-layout.md) | Legibilidad del reporte: iconos, orden de columnas, layout |
| [TC-05](TC-05-purchase-flow.md) | El flujo de compra completo, incluido el rechazo del pago tal como lo ve un cliente |
| [TC-06](TC-06-concurrency-and-races.md) | **Concurrencia observable**: la carrera, los interbloqueos y el rollback contra el stack real, no contra un spec |
| [TC-07](TC-07-login-and-permissions.md) | La matriz público/protegido comprobada endpoint por endpoint, y la manipulación de tokens |
| [TC-08](TC-08-status-and-degradation.md) | Parar Postgres o Redis y ver que la API responde `ok:false` en vez de `500` |
