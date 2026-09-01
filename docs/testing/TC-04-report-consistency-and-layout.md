# TC-04 · Consistencia del reporte, orden de columnas, filtros y layout del dashboard

| | |
|---|---|
| **Estado** | ⬜ **Por ejecutar** |
| **Fecha** | — |
| **Tickets** | TK-043, TK-044, TK-045, TK-046, TK-047 |
| **Archivo** | `LoanPro Code Challenge E-Commerce.csv` (sin modificar, 97 filas de datos) |

## Objetivo

A diferencia de TC-01 a TC-03, que verifican lo que la importación *hace*, este caso verifica lo que
**muestra**. Los cinco tickets salieron de leer un reporte real y encontrar la pantalla más difícil
de leer de lo que los datos justificaban: un estado dibujado de dos formas distintas, columnas
ordenadas de forma diferente en cada tabla, la tabla más larga sin buscador, espacio gastado en
nada, y un bug que la interfaz volvía invisible.

Cada check es independiente. Ejecútalos en orden la primera vez, ya que las precondiciones dejan el
catálogo en el estado que asume el resto.

## Precondiciones

Catálogo vacío, para que los números coincidan exactamente con TC-01:

```bash
docker exec ecommerce-db psql -U postgres -d ecommerce -c "TRUNCATE TABLE products, import_batches RESTART IDENTITY CASCADE;"
```

Luego importa `LoanPro Code Challenge E-Commerce.csv` en **Product → Import CSV**. Contadores
esperados, sin cambios respecto a TC-01:

```
  Total rows 97 = Created 85 + Updated 0 + Unchanged 0 + Rejected 10 + Skipped empty 2
```

---

## 1 · Un estado se ve igual en todas partes (TK-043)

**Por qué existe.** Los iconos y colores se escribían a mano dentro de las tarjetas de resumen y,
otra vez, en un mapa separado que usaban las insignias de la tabla. Coincidían en dos estados por
casualidad y discrepaban en el tercero.

### Pasos

1. En la pantalla de resultado de la importación, mira las seis tarjetas de arriba.
2. Baja a la tabla **Rows to review** y mira las insignias de la columna `Status`.
3. Mira la leyenda al pie de esa tabla.

### Resultado esperado

| Estado | Icono | Color | Dónde debe ser idéntico |
|---|---|---|---|
| Created | más en un círculo | verde | tarjeta ↔ chip de cabecera de `Created rows` |
| Updated | flechas circulares | ámbar | tarjeta ↔ insignia |
| Rejected | cruz en un círculo | rojo | tarjeta ↔ insignia |
| **Skipped empty** | **menos en un círculo** | **azul** | tarjeta ↔ insignia |

- [ ] La tarjeta `Skipped empty` muestra un **menos en un círculo, en azul** — no una goma de borrar,
      y no en gris. Esta es la que discrepaba.
- [ ] Cada insignia de la tabla usa el mismo icono y color que su tarjeta.
- [ ] La leyenda al pie **ya no es texto plano**: cada una de sus tres entradas muestra el icono y
      el color de la insignia que explica.

> Leer la leyenda y luego las insignias no debería requerir traducir entre ambas.

---

## 2 · El SKU se lee antes que el nombre, en todas las tablas (TK-044)

**Por qué existe.** TK-042 puso `Name` primero en la tabla de revisión a petición; el listado de
productos mantuvo `SKU` primero. Esto revierte aquella decisión y fija la tabla de productos como
referencia.

### Pasos

1. En el resultado de la importación, mira la cabecera de **Rows to review**.
2. Mira la cabecera de **Created rows**.
3. Ve a **Product → Product catalog** y mira la cabecera de la grilla.

### Resultado esperado

- [ ] **Rows to review**: `Status · Line · SKU · Name · Reason` — SKU antes que Name.
- [ ] **Created rows**: `Line · SKU · Name · …` — sin cambios, ya lo estaba.
- [ ] **Product catalog**: `SKU · Name · Description · …` — sin cambios, ya lo estaba.
- [ ] Moverse entre las tres tablas nunca obliga a volver a localizar las columnas.

---

## 3 · La tabla `Created rows` se puede buscar (TK-045)

**Por qué existe.** 85 filas creadas sin ninguna forma de mirar dentro.

### Pasos

1. En el resultado de la importación, busca la línea de filtro bajo la cabecera de **Created rows**.
2. Escribe `speaker`.
3. Límpialo con la ✕ del campo.
4. Escribe `zzzzz`.

### Resultado esperado

- [ ] Existe un campo de búsqueda bajo la cabecera, con un contador que dice `Showing 85 of 85`.
- [ ] La cabecera sigue diciendo `Created rows (85)` con su subtítulo — describe la **importación**,
      no la vista filtrada, así que **no** debe bajar al conteo filtrado.
- [ ] `speaker` acota la tabla y el contador baja en consecuencia.
- [ ] La búsqueda cubre **línea, SKU, nombre, categoría y descripción** — prueba con `Electronics`
      (categoría) y con una palabra que solo aparezca en una descripción.
- [ ] La ✕ restaura las 85 filas.
- [ ] `zzzzz` muestra **"No rows match this filter"**, no una tabla vacía en silencio.
- [ ] El mismo campo, con el mismo comportamiento, está en **Rows to review** — donde conserva su
      propio desplegable de `Status` al lado.

---

## 4 · Layout del dashboard (TK-046)

### Pasos

1. Ve a **Product → Product catalog**.
2. Mira el espacio entre el encabezado y la primera fila.
3. Abre el control **Columns**, oculta una columna y vuelve a mostrarla.
4. Cuenta las filas de la primera página.
5. Filtra hasta dejar un puñado de productos — por ejemplo busca `tent`.
6. Selecciona dos filas con las casillas.

### Resultado esperado

- [ ] **Sin banda vacía.** Los filtros y el botón `Columns` comparten **una sola línea**. No hay una
      franja cuyo único contenido sea ese botón.
- [ ] El control `Columns` **sigue funcionando** — es la parte con más probabilidad de romperse,
      porque el botón necesita el contexto interno de la grilla para abrir su panel.
- [ ] `Reset layout` aparece en esa misma línea, y solo después de que hayas redimensionado u
      ocultado una columna.
- [ ] La primera página muestra **20 filas**, no 10. Las opciones de tamaño incluyen 20.
- [ ] Con pocos resultados, el pie de paginación queda **inmediatamente debajo de la última fila** —
      sin bloque en blanco entre ambos.
- [ ] Seleccionar filas revela `Delete (2)` en esa misma línea, y borrar sigue funcionando.
- [ ] En una ventana baja, el pie de paginación sigue siendo alcanzable.

### Encabezado

- [ ] El encabezado de la página dice **`Product catalog`**, no `List`.
- [ ] La miga de pan termina en `Product catalog`.
- [ ] El título de la pestaña del navegador dice `Product catalog | Dashboard - …`.
- [ ] La entrada del desplegable de navegación bajo **Product** dice `Product catalog` y lleva aquí.

### El cambio en los enlaces guardados

Cambiar el tamaño de página por defecto cambia lo que significa un enlace **sin** `limit`.

- [ ] Abre `/dashboard/product` sin query string → 20 filas.
- [ ] Abre `/dashboard/product?limit=10` → 10 filas. Un valor explícito sigue mandando.

> Es intencional: un parámetro ausente significa "el valor por defecto actual", no un 10 congelado.

---

## 5 · Las filas rechazadas llevan su nombre (TK-047)

**Por qué existe.** Las filas rechazadas por SKU duplicado llegaban sin nombre aunque el archivo sí
traía uno, porque ese camino de rechazo no lo propagaba. En pantalla se renderizaba como una raya,
exactamente igual que una fila que genuinamente no tenía nombre — así que el bug era
indistinguible del comportamiento correcto.

Este es el check que la interfaz antes no podía darte.

### Pasos

1. En el resultado de la importación, abre **Rows to review** y pon el filtro `Status` en `Rejected`.
2. Mira la columna `Name` de las líneas **2, 11, 36, 56 y 89** — los rechazos por SKU duplicado.
3. Ahora mira las líneas **25 y 41**.

### Resultado esperado

| Línea | SKU | La columna Name debe mostrar | Por qué |
|---|---|---|---|
| 2 | `RS-001` | `Running Shoes` | SKU duplicado — el archivo **sí** traía nombre |
| 11 | `BS-021` | `Bluetooth Speaker` | SKU duplicado |
| 36 | `RS-001` | `Running Shoes` | SKU duplicado |
| 56 | `BS-021` | `Bluetooth Speaker` | SKU duplicado |
| 89 | `BS-021` | `Bluetooth Speaker` | SKU duplicado |
| 25 | `HD-099` | raya | la celda de nombre estaba genuinamente **vacía** |
| 41 | `WS-001` | raya | la celda de nombre solo tenía espacios |

- [ ] Las cinco filas de SKU duplicado muestran su **nombre real**. Antes de este cambio las cinco
      salían en blanco.
- [ ] Las líneas 25 y 41 siguen mostrando la raya, y ahora esa raya significa una sola cosa: el
      archivo no traía nombre.

### Opcional — verificar a nivel de contrato

```bash
TOKEN=$(curl -s -X POST http://localhost:4000/api/v1/auth/sign-in -H 'Content-Type: application/json' \
  -d '{"email":"demo@demo.com","password":"demo"}' | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)

BATCH=$(curl -s "http://localhost:4000/api/v1/products/import/batches" -H "Authorization: Bearer $TOKEN" \
  | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

curl -s "http://localhost:4000/api/v1/products/import/batches/$BATCH" -H "Authorization: Bearer $TOKEN"
```

> El endpoint está bajo `products/import/batches` y **exige token**. Llamarlo sin él devuelve `401`.

- [ ] Cada entrada de `rejected` y `warnings` lleva **ambas** claves, `name` y `sku`. Una celda en
      blanco es una cadena vacía, nunca una clave ausente.

---

## 6 · Los reportes antiguos siguen abriéndose (regresión)

Los reportes guardados antes de estos cambios no llevan los campos nuevos. No deben romperse.

### Pasos

1. Ve a **Product → Import history**.
2. Abre el detalle de un lote importado **antes** de hoy.

### Resultado esperado

- [ ] El detalle se renderiza completo — sin pantalla en blanco, sin error.
- [ ] Las celdas sin valor guardado muestran una raya.
- [ ] Las tarjetas de resumen y las insignias usan los iconos unificados nuevos, ya que los dibuja
      el frontend y no dependen de lo que se guardó.

---

## Resultado

| Check | Ticket | Resultado |
|---|---|---|
| 1 · Consistencia de estados | TK-043 | |
| 2 · SKU antes que Name | TK-044 | |
| 3 · Filtro en `Created rows` | TK-045 | |
| 4 · Layout del dashboard | TK-046 | |
| 5 · Filas rechazadas con nombre | TK-047 | |
| 6 · Los reportes antiguos siguen abriéndose | regresión | |

**Notas:**
