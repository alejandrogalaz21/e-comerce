# Registro de pruebas manuales

Evidencia del sistema ejercitado de punta a punta contra el stack de Docker. Cada caso registra qué
se esperaba **antes** de ejecutarlo, qué ocurrió en realidad, y — cuando aplica — una captura del
resultado.

## Entorno

| | |
|---|---|
| App | `http://localhost:3000` |
| API | `http://localhost:4000/api/v1` |
| Swagger | `http://localhost:4000/api/v1/docs` |
| Stack | `docker compose up -d --build` desde la raíz del repositorio |
| Cuenta | `demo@demo.com` / `demo` |
| Archivos de muestra | [`docs/csv/`](../csv/) — el CSV del challenge y dos variantes |

Reinicia el catálogo entre casos con:

```bash
docker exec ecommerce-db psql -U postgres -d ecommerce -c "TRUNCATE TABLE order_items, orders, products, import_batches RESTART IDENTITY CASCADE;"
```

> `order_items` y `orders` van primero a propósito: una línea de pedido referencia al producto con
> `RESTRICT`, así que truncar `products` a solas es rechazado. Esa negativa es en sí misma el
> comportamiento correcto.
>
> `user` y `migrations` no se truncan nunca: la primera guarda la cuenta demo, la segunda es el
> historial de esquema de TypeORM.

## Los archivos de muestra

Todas las variantes difieren del original **solo en la línea 55**, la fila `RS-050`. Mantener el
cambio en una sola línea es lo que hace legibles los contadores: cualquier fila que cambie de cubeta
lo hizo por esa edición y por nada más.

| Archivo | Línea 55 | Lo usa |
|---|---|---|
| `LoanPro Code Challenge E-Commerce.csv` | `Budget running shoes...`, `49.99`, `200` | TC-01 |
| `...-T1.csv` | `UPDATED DESCRIPTION`, `59.99`, `150` | TC-02, y paso 1 de TC-03 |
| `...-T3.csv` | igual que T1 pero `64.99` | paso 2 de TC-03 |

## Casos

Ver [STRATEGY.md](STRATEGY.md) para qué está cubierto automáticamente, a qué nivel, y qué se deja
deliberadamente a estos casos manuales. Ver [MATRIX.md](MATRIX.md) para la lista completa de casos
de uso por proceso.

| # | Caso | Cubre | Estado |
|---|---|---|---|
| [TC-01](TC-01-initial-import.md) | Importación inicial sobre un catálogo vacío | crear · rechazar · omitir · regla de SKU duplicado | ✅ Aprobado |
| [TC-02](TC-02-upsert-existing-product.md) | Reimportación con un producto modificado | actualizar · sin cambios · orden por `updatedAt` | ✅ Aprobado |
| [TC-03](TC-03-unchanged-does-not-write.md) | `Unchanged` no escribe, `Updated` sí | ausencia de escrituras · integridad de marcas de tiempo | ✅ Aprobado |
| [TC-04](TC-04-report-consistency-and-layout.md) | Consistencia del reporte, columnas, filtros y layout | iconos de estado · SKU antes que Name · filtros · contrato de `name` | ⬜ Por ejecutar |
| [TC-05](TC-05-purchase-flow.md) | Flujo de compra: stock, idempotencia y pago falso | pedido atómico · precio congelado · idempotencia · pago rechazado | ⬜ Por ejecutar |
| [TC-06](TC-06-concurrency-and-races.md) | **Concurrencia, bloqueos y condiciones de carrera** | `FOR UPDATE` · interbloqueos · claves en paralelo · rollback · Redis caído | ⬜ Por ejecutar |
| [TC-07](TC-07-login-and-permissions.md) | Login, sesión y matriz de permisos | público vs protegido · token alterado · límite de tasa · atribución | ⬜ Por ejecutar |
| [TC-08](TC-08-status-and-degradation.md) | Status, salud y degradación de dependencias | escritura real en Redis · `ok:false` en vez de `500` · refresco automático | ⬜ Por ejecutar |

## Por dónde empezar según lo que quieras ver

| Si quieres ver... | Empieza por |
|---|---|
| Que el CSV del challenge se importa entero y bien | [TC-01](TC-01-initial-import.md) |
| Que reimportar no reescribe lo que no cambió | [TC-03](TC-03-unchanged-does-not-write.md) |
| Que una compra mueve stock real y congela el precio | [TC-05](TC-05-purchase-flow.md) |
| **Que dos compradores no se llevan la misma última unidad** | [TC-06 · R1](TC-06-concurrency-and-races.md) |
| Que un pago rechazado no deja nada a medias | [TC-05](TC-05-purchase-flow.md) check 6 · [TC-06 · R7](TC-06-concurrency-and-races.md) |
| Qué puede hacer alguien sin cuenta | [TC-07](TC-07-login-and-permissions.md) |
| Qué pasa si se cae Postgres o Redis | [TC-08](TC-08-status-and-degradation.md) |

## Los cinco desenlaces de la importación

Cada fila de datos cae en exactamente una cubeta, y las cubetas siempre suman:

```
  Filas totales = Creadas + Actualizadas + Sin cambios + Rechazadas + Vacías omitidas
```

| Desenlace | Significado |
|---|---|
| **Created** | El SKU no existía. Insertada. |
| **Updated** | El SKU existía y al menos uno de los seis campos comparables difería. Sobrescrita. |
| **Unchanged** | El SKU existía y `name`, `description`, `category`, `price`, `stock` y `weight_kg` eran todos idénticos. La base de datos no se tocó. |
| **Rejected** | La fila falló la validación de formato, una regla de negocio, o su SKU aparecía más de una vez en el archivo. No se guardó nada. |
| **Skipped empty** | Todas las celdas estaban en blanco. Ignorada como ruido de exportación, no contada como error. |

## Los desenlaces de un pedido

```
  POST /orders  -->  201  pedido nuevo, cobrado, stock descontado
                     200  clave de idempotencia repetida: el mismo pedido, sin cobrar otra vez
                     400  contrato invalido (clave no-UUID, direccion incompleta, campo desconocido)
                     402  PAYMENT_DECLINED  — nada guardado, stock intacto, queda orden FAILED
                     404  un producto referenciado no existe
                     409  INSUFFICIENT_STOCK — con sku, requested y available
```

| Estado en `orders` | Significa |
|---|---|
| `PAID` | El cobro fue aprobado y el stock se descontó, todo en la misma transacción. |
| `FAILED` | El cobro fue rechazado. Se guarda con su motivo, **sin** movimiento de stock. |
| `PENDING` | Solo existe *dentro* de la transacción. Una fila `PENDING` persistida es un defecto. |
