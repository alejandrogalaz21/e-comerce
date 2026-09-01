## Context

TK-049 añadió a `orders` siete columnas `ship_*` con la dirección de entrega y las expone en el
detalle de la compra. TK-053 amplió la búsqueda `q` al nombre y al teléfono del destinatario y
juntó ambos en una columna `Customer` del listado. Faltan tres cosas que el usuario pidió tras
usarlo: el correo de contacto no se pide en ningún momento, los otros cinco campos de la dirección
solo se ven abriendo la orden, y la tabla reparte el espacio de forma que quedan huecos muertos
mientras el destinatario y su teléfono comparten celda.

El formulario que captura la entrega es `web/src/sections/address/address-new-form.tsx` ("New
address"), usado desde el checkout. Ya tiene `Field.Phone`, que muestra bandera y lada del país; el
listado del dashboard pinta el número crudo en formato internacional.

Restricciones vigentes: el saneado de los campos de envío (trim + `@NoHtml()`) viene de TK-050 y se
aplica a todo lo que entre por `ShippingAddressDto`; el esquema se cambia siempre por migración
(`DB_SYNC=false`); comprar no requiere sesión, y `order-history` prohíbe presentar la compra como
atribuida a un cliente.

## Goals / Non-Goals

**Goals:**

- Pedir, validar, persistir y mostrar un correo de contacto de la entrega.
- Mostrar en el listado los datos de entrega que la orden ya guarda, cada uno en su columna, con el
  teléfono legible por país.
- Que `q` encuentre una orden por correo o por cualquier campo de la dirección.
- Que las órdenes anteriores —sin dirección, sin correo— sigan abriéndose y listándose.

**Non-Goals:**

- Una entidad cliente, un historial por comprador o navegación desde el correo a "sus otras
  compras": `order-history` lo prohíbe y este cambio no lo revisa.
- Persistir `addressType` (Home/Office) y `primary` del formulario. Son controles de una libreta de
  direcciones guardadas que no existe: `primary` marca la dirección por defecto de un usuario que no
  hay, y ninguno describe a dónde va este pedido. Se quedan como están, sin viajar al API.
- Verificar el correo (enviar un mensaje de confirmación) ni notificar por correo la compra.
- Filtros dedicados por correo o por ciudad. El criterio de texto único ya cubre el caso; una
  columna por filtro es un motor de queries genérico, descartado en TK-036.

## Decisions

### El correo viaja dentro de `shippingAddress`, no como campo suelto de la orden

Se añade `email` a `ShippingAddressDto` y la columna `ship_email` al lado de las otras siete. El
correo es el contacto **de esa entrega**, congelado con ella, igual que el teléfono.

Alternativa considerada: un `customerEmail` de primer nivel en `CreateOrderDto`. Se descarta porque
nombra un cliente que el dominio no tiene y abre la puerta a tratarlo como identidad —agrupar
órdenes por correo, deducir un comprador—, justo lo que `order-history` prohíbe. Dentro de
`shippingAddress` el dato es lo que es: cómo contactar a quien recibe.

### Columna nullable en base de datos, obligatoria en el DTO

Mismo criterio que TK-049 con la dirección: `ship_email varchar(255)` nullable, porque las órdenes
ya registradas no tienen correo y no se puede inventar uno. La obligatoriedad la impone
`@IsEmail()` + `@IsNotEmpty()` en el DTO, no la base de datos. Estricto al escribir, tolerante al
leer.

Alternativa considerada: `NOT NULL` con un relleno (`''` o `unknown@example.com`). Se descarta:
un correo inventado es indistinguible de uno real cuando alguien intente escribir a él.

### El teléfono se muestra con bandera derivada del propio número

El número se guarda en formato internacional (`+52...`), así que el país se deduce con
`parsePhoneNumber(value)?.country` de `react-phone-number-input` —ya es dependencia del formulario—
y se pinta con `FlagIcon` de `components/iconify`, el mismo componente que usa `Field.Phone`. No
hace falta guardar el país del teléfono como columna: es información contenida en el propio dato.

Un número que no se pueda parsear se muestra tal cual, sin bandera, en vez de ocultarlo.

### La tabla reparte el ancho entre las columnas de contenido variable

`Order`, `Date`, `Items`, `Total`, `Status` y las acciones tienen ancho fijo —su contenido no
varía—. El espacio elástico se reparte entre `Customer`, `Email` y `Address`, que sí. Es la misma
corrección que TK-041 hizo en la lista de productos, donde `Name` con `flex: 1` se comía la fila.

La dirección se muestra en dos líneas dentro de su celda (calle / ciudad, estado, CP, país). Es la
única celda con un dato compuesto, y no se parte en cinco columnas porque cinco columnas estrechas
truncan las cinco.

Alternativa considerada: persistir anchos y visibilidad de columnas en localStorage como TK-041.
Se descarta de este cambio: son diez columnas, no un panel de preferencias, y el problema reportado
es el reparto por defecto.

### El generador del recibo se muda a `sections/purchase/`

`downloadReceipt(purchase)` y `buildReceiptDocument(purchase)` viven hoy en `sections/checkout/`,
pero ambos reciben un `IPurchase` y describen una compra, no el proceso de comprarla. Se mueven a
`sections/purchase/` y el checkout los importa desde ahí.

Alternativa considerada: dejarlos donde están e importarlos desde `sections/purchase`. Se descarta
porque invierte la dependencia —el checkout usa compras, no al revés— y `fe-architecture` pide que
cada sección sea dueña de su dominio. Precedente del sentido correcto: `use-purchase.ts` ya importa
`productKeys` de `sections/product`.

Alternativa considerada: extraerlos a un lugar neutro (`utils/`, `components/`). Se descarta porque
el generador conoce el tipo `IPurchase`: no es un helper genérico, es código del dominio de compras.

El import dinámico de `@react-pdf/renderer` se conserva tal cual. Es la razón por la que el botón
necesita estado de carga: entre el clic y el archivo hay una descarga de chunk más el render del
PDF. El botón del detalle usa `LoadingButton` y muestra el fallo si la generación no termina, en
vez de quedarse sin respuesta.

### La búsqueda amplía la misma expresión, sin índice nuevo

`q` pasa a mirar también `ship_email`, `ship_address`, `ship_city`, `ship_state`, `ship_zip_code` y
`ship_country`, con el `ILIKE '%término%'` que ya se usa para nombre y teléfono. Un comodín inicial
no puede aprovechar un índice btree, así que **no** se añade ninguno: sería un índice que nunca se
usa. Si el volumen lo pidiera, la respuesta es `pg_trgm` + GIN, no un btree, y eso es otro ticket.

## Risks / Trade-offs

- **[El correo obligatorio rompe a cualquier cliente del API que ya llame a `POST /orders`]** → Es
  un cambio de contrato deliberado y anunciado como **BREAKING** en la propuesta. El único cliente
  es el checkout de esta app, que se actualiza en el mismo cambio; Swagger y `docs/testing/TC-05`
  se corrigen para que la guía manual no vuelva a documentar un payload que el API rechaza, como
  pasó en TK-051.
- **[La búsqueda hace seq scan sobre `orders` con seis columnas más]** → Aceptado. El volumen del
  challenge es de decenas de órdenes y la alternativa (GIN + `pg_trgm`) es infraestructura que
  nadie ha pedido. Queda escrito aquí para que la decisión sea rastreable.
- **[Diez columnas no caben en pantallas estrechas]** → El grid desplaza horizontalmente y las
  celdas truncan con tooltip; ninguna información se pierde, solo exige desplazarse.
- **[El chunk de `@react-pdf/renderer` se descarga al pulsar el botón, no antes]** → Es la misma
  compensación que ya se tomó en el checkout: peso fuera del bundle principal a cambio de una
  espera en el primer uso, cubierta con estado de carga en el botón.
- **[Las órdenes previas se ven vacías en tres columnas]** → Se muestra ausencia explícita (`—`),
  distinguible de un fallo de carga, tal como exige el spec.

## Migration Plan

1. Migración `<timestamp>-order-shipping-email.ts`: `ADD COLUMN IF NOT EXISTS "ship_email"
   varchar(255)` sobre `orders`; `down` con `DROP COLUMN IF EXISTS`. Sin backfill: no hay valor
   honesto con el que rellenar.
2. Desplegar API y web juntos. Entre ambos despliegues, un checkout viejo contra un API nuevo
   recibiría 400 al comprar; el compose levanta los dos servicios a la vez.
3. Rollback: revertir el código; la columna puede quedarse (es nullable y nada la exige). Si se
   revierte también la migración, se pierden los correos ya capturados — hacerlo solo si el cambio
   se abandona.

## Open Questions

Ninguna. Las tres decisiones que dependían del usuario —correo obligatorio, mostrar todos los
campos del formulario en la tabla, y flujo OpenSpec antes de implementar— quedaron cerradas al
proponer el cambio.
