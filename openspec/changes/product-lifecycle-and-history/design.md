## Context

Dos huecos con la misma raíz: el catálogo solo sabe describir **cómo está un producto ahora**, no
cómo llegó ahí ni qué fue de él.

El primero apareció usando la app. `PRJ-001` se vendió, así que la FK `RESTRICT` de `order_items`
impide borrarlo — correctamente, porque borrarlo destruiría la línea que prueba la venta. Pero el
administrador no quería borrar la venta: quería sacar el producto de la tienda, y esa operación no
existe. El `409 RESOURCE_IN_USE` es la respuesta correcta a la pregunta equivocada.

El segundo lo declaró el propio spec de diseño. `initial.md` §4.5 dice que guardar el histórico en
una fintech es *"casi obligatorio"*, implementa el mínimo viable (`import_batches` con reporte por
fila) y deja el resto documentado como futuro. Hoy `import_batches` responde qué pasó en un import;
nada responde qué pasó con un producto cuando el cambio vino del CRUD.

Restricciones que el diseño hereda y no negocia:

- Una orden es un registro histórico. `unit_price_snapshot` y la FK `RESTRICT` existen para que el
  pasado no se reescriba, y nada de esto puede debilitarlos.
- El carrito ya trata `404` de `GET /products/:id` como "ya no está disponible" (TK-055). Cualquier
  estado nuevo que el catálogo invente tiene que caber en ese contrato o romperlo.
- El listado de productos está cacheado en Redis por combinación de query params, invalidado por
  prefijo en cada escritura.

## Goals / Non-Goals

**Goals:**

- Que el administrador pueda retirar un producto vendido y devolverlo al catálogo.
- Que un producto retirado sea indistinguible de uno borrado **para quien compra**, sin que el
  cliente aprenda un estado nuevo.
- Que todo cambio de un producto quede registrado, venga del CRUD, del import o de SQL directo.
- Que el historial siga siendo legible después de borrar el producto que documenta.

**Non-Goals:**

- Papelera con purga automática, o retención con TTL. Un producto retirado se queda retirado hasta
  que alguien lo restaure o lo borre.
- Historial de órdenes o de cualquier otra entidad. Solo productos.
- Revertir un producto a un estado anterior desde el historial. Se lee, no se aplica.
- Quién hizo cada cambio. El trigger corre en la base, donde no existe el usuario de la petición;
  atarlo exigiría propagar el usuario a la sesión de Postgres en cada request. Se documenta como
  límite conocido — `import_batches.imported_by` ya cubre la atribución del camino que importa.

## Decisions

### 1. `discontinued_at timestamptz` en vez de `active boolean`

Una marca temporal da el booleano gratis (`active = discontinued_at IS NULL`) y además responde
**desde cuándo**. Con un historial en la misma entrega, esa fecha es justamente el dato que alguien
va a querer cruzar.

Alternativa descartada: `active boolean NOT NULL DEFAULT true`. Más obvia de leer en un `SELECT`,
pero obliga a mirar el historial para saber cuándo se retiró — información que la columna podía
llevar sin coste.

Sin índice parcial por ahora: el catálogo son 85 filas y `WHERE discontinued_at IS NULL` sobre esa
cardinalidad no lo justifica. Se anota como lo primero a añadir si el catálogo crece.

### 2. El historial lo escribe un trigger de Postgres, no el servicio

El catálogo lo escriben al menos tres caminos: `ProductsService`, `ImportService` y las migraciones.
Un registro escrito en el servicio captura los dos primeros y solo si nadie olvida llamarlo — y es
exactamente la clase de olvido que produjo TK-047, donde una de tres rutas de rechazo no propagaba
un campo.

Es el mismo razonamiento que ya sostiene el control de stock: la garantía vive donde nadie puede
rodearla. Un `AFTER INSERT OR UPDATE OR DELETE ... FOR EACH ROW` no se puede saltar.

Alternativas descartadas:

- **Subscriber de TypeORM**: se salta cualquier `queryRunner.query` crudo, y el proyecto usa SQL
  crudo justo en las rutas más delicadas (`lockProducts`, `discountStock`).
- **Event sourcing**: rediseñar el modelo por una feature de lectura.

El trigger SHALL ignorar los `UPDATE` que no cambian nada (`OLD IS DISTINCT FROM NEW`), o cada
reimportación del catálogo escribiría 85 entradas vacías y el historial dejaría de servir.

### 3. `product_history` no tiene clave foránea a `products`

Una tabla de auditoría restringida por lo que audita se borra con ello. Si `product_history`
apuntase a `products` con `RESTRICT`, borrar un producto sería imposible; con `CASCADE`, borrarlo
destruiría su historia — incluida la entrada del propio borrado, que es la más valiosa.

Se guarda `product_id uuid` sin FK, más el `sku` desnormalizado en cada entrada, para poder
encontrar la historia de algo que ya no existe.

### 4. Un producto retirado responde `404`, no `200` con una marca

`GET /products/:id` es público y lo consume la revalidación del carrito, que ya interpreta `404`
como "ya no está disponible". Devolver `200` con `discontinued: true` obligaría a cambiar el FE
para entender un tercer estado, y a que cada consumidor futuro recuerde comprobarlo — mientras que
el `404` hace lo correcto por omisión.

El administrador no necesita ese `GET`: ve los retirados por el listado con `?status=discontinued`,
y restaura por `PATCH /products/:id/restore`, que busca ignorando el estado.

Coste aceptado: la pantalla de edición de un producto retirado no carga. Restaurar primero y editar
después es un flujo razonable, y evita que el detalle público tenga dos comportamientos.

### 5. `DELETE` no cambia de significado

Convertir `DELETE` en soft delete habría sido más simple, pero borra una garantía observable: el
`409 RESOURCE_IN_USE` que prueba que una venta no se puede deshacer, hoy cubierto por cuatro tests
y cuatro documentos.

Quedan dos operaciones con dos nombres:

| Operación | Endpoint | Sobre un producto vendido |
|---|---|---|
| Retirar | `PATCH /products/:id/discontinue` | Funciona |
| Borrar | `DELETE /products/:id` | `409`, como hoy |

La UI ofrece las dos y marca el borrado como permanente, de modo que nadie borre creyendo que
oculta. Cuando el borrado falle con `409`, la interfaz ofrece retirar — que es lo que se quería.

### 6. El filtro de estado por defecto es "a la venta"

`GET /products` gana `?status=active|discontinued|all` con `active` por defecto. Cualquier
consumidor que no conozca el parámetro sigue viendo lo que veía: la tienda pública, el carrito y
los tests existentes no cambian de comportamiento.

Estado y disponibilidad se mantienen como filtros separados. `inStock=false` es un producto que
sigue a la venta y volverá a tener existencias; retirado es uno que ya no se vende. Fundirlos
escondería productos vivos.

### 7. Reimportar un SKU retirado lo reactiva, y se reporta como `updated`

El archivo es una corrección de catálogo y quien lo sube está re-añadiendo el producto a propósito;
dejarlo retirado sería sorprendente y silencioso.

El caso delicado es cuando los demás campos coinciden: `isIdentical` diría "sin cambios" y el
reporte ocultaría la reactivación. La comparación pasa a considerar el estado, de modo que un
producto retirado nunca se cuente como `unchanged`.

### 8. Retirar y restaurar invalidan la caché del catálogo

Son escrituras que cambian lo que la tienda muestra. Sin invalidar, un producto retirado seguiría
apareciendo hasta cinco minutos — exactamente el bug que TK-049 arregló para la compra.

## Risks / Trade-offs

- **Olvidar el filtro en una consulta y publicar un producto retirado** → el filtro se aplica en un
  único punto por consulta (`findAll`, `findOne`, `findCategories`), cada uno con su escenario en el
  spec y su test. Es el riesgo principal de esta entrega.
- **Lógica en la base, invisible desde el código** → el trigger vive en una migración versionada y
  se prueba contra Postgres real, no con mocks; un spec de integración afirma que un `UPDATE` por
  SQL directo produce una entrada.
- **El historial no dice quién** → declarado como Non-Goal, con `import_batches.imported_by`
  cubriendo la atribución del camino masivo.
- **`jsonb` por fila crece sin techo** → 85 productos y cambios manuales; el volumen no es un
  problema a esta escala y la alternativa (guardar solo los campos cambiados) pierde la foto
  completa que hace útil una auditoría.
- **La edición de un producto retirado no carga** → consecuencia aceptada de la decisión 4, con el
  flujo restaurar-y-editar como salida.

## Migration Plan

Dos migraciones, ambas idempotentes y con `down` real:

1. `products.discontinued_at` — columna nullable. Todos los productos existentes quedan a la venta,
   que es su estado actual. Sin backfill.
2. `product_history` + la función y el trigger. Al aplicarse, el historial arranca vacío: los
   productos existentes no tienen pasado registrado, y la interfaz lo dice explícitamente en vez de
   mostrar una lista vacía sin explicación.

Rollback: `down` de la segunda borra trigger, función y tabla; `down` de la primera borra la
columna. Ninguna toca `orders` ni `order_items`.
