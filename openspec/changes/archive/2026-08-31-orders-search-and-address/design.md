## Context

TK-048 conectó la pantalla de órdenes al API sin tocar el servidor. Este change no puede: los tres
puntos son limitaciones del backend.

```
  ESTADO ACTUAL

  Comprar                             Consultar ordenes
  =======                             =================
  CreateOrderDto                      OrderFiltersDto
    items[]                             page
    idempotencyKey                      limit
       |                                  |
       v                                  v
  orders.service.create()             findAll()
    FOR UPDATE + descuento              order by createdAt DESC
    cobro simulado                      sin criterios
    INSERT order + items
       |
       X  no avisa a la cache        Checkout recoge la direccion
       |                                    |
  products:list:* en Redis                  X  nunca se envia
  TTL 300s, stock viejo                     |
                                       se pierde al confirmar
```

La caché se invalida hoy desde `products.service` (create/update/remove) y desde `import.service`.
`orders.service` es el cuarto sitio donde cambia el stock y el único que no lo hace. `OrdersModule`
importa `TypeOrmModule`, `CommonModule` y `PaymentModule`; no conoce `ProductsModule`, y
`ProductsModule` tampoco conoce `OrdersModule`, así que la dependencia nueva no cierra ciclo.

## Goals / Non-Goals

**Goals:**

- Que el stock que se ve sea el stock que hay, inmediatamente después de comprar.
- Que la dirección que el checkout pide quede guardada y visible, o no se pida.
- Que buscar y filtrar órdenes se resuelva sobre todas, no sobre la página visible.

**Non-Goals:**

- Costo de envío, impuestos, transportistas. Se guarda **dónde**, no **cuánto cuesta llevarlo**.
- Libreta de direcciones reutilizable: no hay cuenta a la que asociarlas.
- Editar la dirección de una orden existente. Es registro histórico.
- Ordenamiento por columna en la tabla de órdenes. `createdAt DESC` es el orden natural de un
  historial; añadir `sortBy` sería repetir TK-039 sin un caso de uso que lo pida.

## Decisions

### D1: La compra invalida la caché, no se baja el TTL

**Elegido**: `OrdersModule` importa `ProductsModule`; tras confirmar la orden, el servicio llama a
`productsService.invalidateCache()`.

**Alternativa descartada**: bajar los 300 s a 15 s. Mitiga el síntoma y le quita a Redis casi todo
el beneficio para el que se introdujo en TK-038 —la tienda pega al API en cada tecleo—. Además
dejaría el defecto conceptual intacto: la caché seguiría sin saber que el stock cambió, y con más
tráfico la ventana volvería a ser visible.

**Dónde se llama importa.** La invalidación va **después** de que la transacción confirme, nunca
dentro. Invalidar dentro y luego hacer `ROLLBACK` —un cobro rechazado, por ejemplo— tiraría la
caché por un cambio que no ocurrió: no es incorrecto, pero es trabajo perdido y confunde el
razonamiento. Una orden rechazada no invalida nada, porque no descontó nada.

**La invalidación no puede tumbar la compra.** `invalidateCache()` ya tolera una caché caída
(`this.cache?.`), y la llamada va fuera de la transacción, así que un Redis muerto degrada la
frescura sin afectar a la orden, que ya está confirmada. Esto respeta el requirement existente
"Una caché caída degrada, nunca rompe".

### D2: La dirección va en columnas, no en JSONB

**Elegido**: columnas planas en `orders` — `ship_name`, `ship_phone`, `ship_address`, `ship_city`,
`ship_state`, `ship_zip_code`, `ship_country`.

**Alternativa descartada**: una sola columna `shipping_address JSONB`. Es tentadora porque el
formulario ya maneja el objeto completo, pero renuncia a las constraints de Postgres —`NOT NULL`,
longitudes— que en este proyecto son la última línea de la defensa en profundidad del import y del
CRUD. Un JSONB acepta `{}` sin protestar.

**Nullable pese a ser obligatorias al escribir.** Las órdenes que ya existen no tienen dirección, y
una migración no puede inventarla. Las columnas nacen nulas; quien exige el dato es el DTO. Es la
misma asimetría deliberada de TK-047: **estricto al escribir, tolerante al leer**.

`addressType` y `primary` del formulario **no se guardan**: "Home/Office" y "usar por defecto"
pertenecen a una libreta de direcciones que no existe.

### D3: `q` busca por identificador y por línea, en una sola consulta

El criterio nace de una restricción: una orden no tiene cliente. Lo que la identifica es su UUID, y
lo que la distingue de otra es lo que contiene.

```sql
-- forma de la condicion, no el SQL literal
WHERE o.id::text ILIKE :q || '%'          -- prefijo, para pegar un id abreviado
   OR EXISTS (SELECT 1 FROM order_items i
              WHERE i.order_id = o.id
                AND (i.sku ILIKE '%' || :q || '%'
                  OR i.name ILIKE '%' || :q || '%'))
```

**Prefijo para el id, contiene para SKU y nombre.** El id se busca por prefijo porque así es como se
muestra (8 caracteres) y como se copia; un `%...%` sobre un UUID daría coincidencias por el medio
que no significan nada. SKU y nombre sí se buscan por contenido.

**`EXISTS`, no `JOIN`.** Un `JOIN` a `order_items` multiplicaría la orden por sus líneas y rompería
`findAndCount`, que es lo que alimenta la paginación. `EXISTS` filtra sin duplicar filas.

**Se busca sobre la línea, no sobre el producto.** `order_items` guarda `sku` y `name` **como se
vendieron**. Buscar contra `products` haría que renombrar un producto perdiera sus órdenes
históricas, que es justo lo contrario de lo que un snapshot existe para garantizar.

### D4: El rango de fechas se valida, no se deja pasar

`dateFrom` y `dateTo` son opcionales e independientes. Un rango invertido se **rechaza con 400**, no
devuelve lista vacía: una lista vacía es indistinguible de "no hay órdenes en ese rango", y esconder
un error del cliente detrás de un resultado legítimo es la misma clase de mentira que D3 evita.

`dateTo` se interpreta **inclusivo hasta el final del día**. Pedir "hasta el 30 de agosto" y no ver
una orden de las 22:00 de ese día sería sorprendente. Se aplica `< dateTo + 1 día` en vez de
`<= dateTo`, que con `timestamptz` recortaría a medianoche.

`ProductFiltersDto` de TK-039 es el modelo a seguir para la whitelist y los validadores.

### D5: El motivo del rechazo en la tabla es solo frontend

`declineReason` ya viaja en la respuesta del listado. Mostrarlo no requiere nada del API: es un
tooltip sobre el badge `FAILED`. Se deja explícito para que no se confunda con el resto del grupo,
que sí es backend.

### D6: El toolbar reutiliza el patrón del listado de productos

Buscador que aplica con Enter (no al teclear, para no generar una entrada de historial por
pulsación), estado y fechas en la URL vía `useSearchParams`, y chips de filtro activo con
`components/filters-result/`. Es el patrón que TK-036 y TK-041 dejaron establecido; inventar otro
haría que dos tablas del mismo dashboard se comporten distinto.

Cualquier cambio de criterio vuelve a la página 1: la página 5 de un resultado nuevo suele estar
vacía. Lo mismo que hace `useShopParams`.

## Risks / Trade-offs

| Riesgo | Mitigación |
|---|---|
| Dependencia circular `OrdersModule` -> `ProductsModule` | Verificado: ninguno de los dos importa al otro hoy. Si apareciera, la salida es inyectar `CacheService` directamente en vez del servicio |
| `q` con `EXISTS` sobre `order_items` escala mal | Índice en `order_items(sku)` y en `order_items(order_id)`. El volumen de un challenge no lo justifica por sí solo, pero el índice es barato |
| Exigir dirección rompe clientes existentes | **BREAKING deliberado.** Los e2e y cualquier `curl` de la documentación mandan `items` + `idempotencyKey` y empezarán a recibir 400. Hay que actualizarlos en el mismo change |
| Órdenes viejas sin dirección | Columnas nullable; el detalle dice "no se registró dirección" en vez de dejar el bloque vacío |
| Invalidar la caché en cada compra la vuelve inútil con tráfico alto | Es el mismo trade que ya se aceptó para el CRUD en TK-038: preferir correcto sobre rápido. Documentado, no ignorado |
| `ILIKE` sin índice trigram hace scan | Aceptable al volumen del proyecto; se nombra como límite conocido en vez de dejarlo implícito |

## Migration Plan

Una migración: siete columnas nullable en `orders` más los índices de `order_items`. No reescribe
filas existentes, así que es instantánea y reversible dropeando las columnas.

Orden de trabajo: caché (aislado y urgente) → dirección BE → dirección FE → filtros BE → filtros FE.
La caché va primero porque es el bug visible y no depende de nada más.

## Open Questions

1. ¿El país se guarda como el nombre que devuelve el selector, o como código ISO? El formulario
   entrega el nombre. Guardar el nombre es fiel a lo que el comprador vio; el código sería más útil
   si algún día hubiera cálculo de envío, que está fuera de alcance. Propuesta: **el nombre**.
2. ¿La dirección debería aparecer también en el recibo PDF? Hoy no está. Es una línea de trabajo
   pequeña una vez que el dato existe, pero no la pidió nadie.
