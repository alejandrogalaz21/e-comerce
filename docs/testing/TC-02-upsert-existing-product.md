# TC-02 · Reimportación con un producto modificado

| | |
|---|---|
| **Estado** | ✅ **Aprobado** |
| **Fecha** | 2026-08-28 |
| **Tickets** | TK-009, TK-036, TK-039, TK-042 |
| **Archivo** | `LoanPro Code Challenge E-Commerce-T1.csv` — las mismas 97 filas, una de ellas editada |

## Objetivo

Verificar el camino del upsert: reimportar un catálogo que ya existe debe actualizar solo lo que
realmente cambió, dejar todo lo demás intacto y — esto es lo crucial — hacer que ese único cambio
sea **localizable** en la interfaz.

Es el caso que justifica la columna `Updated at`. Una importación que actualiza no cambia el tamaño
del catálogo, así que sin una forma de ordenar por fecha de actualización el cambio queda invisible
entre 85 filas.

## Precondiciones

TC-01 completado, de modo que el catálogo tiene los 85 productos del archivo original.

```
  products         85
  RS-050 almacenado como:
    description   Budget running shoes for beginners
    price         49.99
    stock         200
    createdAt  =  updatedAt        (nunca modificado)
```

## Datos de prueba

Se cambió la línea 55 del archivo, y solo esa línea:

```diff
- Running Shoes,RS-050,Budget running shoes for beginners,Footwear,49.99,200,0.30
+ Running Shoes,RS-050,UPDATED DESCRIPTION,Footwear,59.99,150,0.30
```

Tres de los seis campos comparables difieren: `description`, `price` y `stock`. `weight_kg` se
mantiene en `0.30`, y `name` y `category` quedan intactos.

## Pasos

1. Sube el archivo editado en **Product → Import CSV**.
2. Ve a **Product → List** y busca `RS-050`.
3. Ordena por **Updated at** descendente.
4. Activa **Created at** desde el menú *Columns* y ordena por él descendente.

## Resultado esperado

| Métrica | Esperado | Por qué |
|---|---|---|
| Filas totales | 97 | el archivo no cambió de tamaño |
| Creadas | 0 | todos los SKU ya existen |
| **Actualizadas** | **1** | RS-050, línea 55 |
| Sin cambios | 84 | 85 menos RS-050 |
| Rechazadas | 10 | las mismas diez de TC-01, sin verse afectadas por la edición |
| Vacías omitidas | 2 | líneas 62 y 63 |

La tabla del reporte pasa de 12 filas a **13**, y la nueva es ámbar:

```
  Updated row   55   Running Shoes   RS-050   sku already exists with different data — updated
```

La tabla `Created rows` **no debe renderizarse en absoluto**: solo aparece cuando se insertó algo.

## Criterios de aceptación

- [x] `0 + 1 + 84 + 10 + 2 = 97`
- [x] El catálogo sigue teniendo 85 productos — una actualización no cambia su tamaño
- [x] `RS-050` almacena `59.99`, `150` y `UPDATED DESCRIPTION`
- [x] `createdAt` **no cambió** y `updatedAt` avanzó
- [x] Ordenar por `Updated at` descendente pone a RS-050 primero
- [x] Ordenar por `Created at` descendente **no** lo pone primero
- [x] La fila actualizada muestra su nombre, a diferencia de las rechazadas por duplicado (TK-047)

## Resultado real

Coincidió exactamente con lo esperado.

```
  Total rows   97
  Created       0
  Updated       1
  Unchanged    84
  Rejected     10
  Skipped       2

  Rows to review (13)
  10 rejected and not saved · 1 overwrote an existing SKU · 2 blank and skipped
```

Verificado en la base de datos:

```sql
select sku, description, price, stock, "createdAt" = "updatedAt" as untouched
from products where sku = 'RS-050';

 RS-050 | UPDATED DESCRIPTION | 59.99 | 150 | f
```

`untouched = f` es la prueba: las dos marcas de tiempo divergieron, así que la fila se escribió, y
`createdAt` conservó su valor original.

## Por qué importa

La importación hace upsert por SKU. Una fila que ya existía se **actualiza, no se crea**, así que
su fecha de creación nunca se mueve. Ordenar el catálogo por `Created at` — la única columna de
fecha que tenía el dashboard antes de TK-036 — no puede sacar a la superficie lo que tocó una
importación.

```
  order by Created at desc   ->  los mismos productos viejos, RS-050 enterrado
  order by Updated at desc   ->  RS-050 primero, solo, arriba del todo
```

Ese contraste es la razón por la que se añadió `updatedAt` a la lista blanca de campos ordenables de
la API (TK-039) y se expuso como columna en el dashboard (TK-036).

## Evidencia

![Resumen y la fila ámbar actualizada](assets/tc-02-updated-row.png)
