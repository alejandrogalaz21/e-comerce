# Datos de entrega completos en la orden (TK-054)

## Why

TK-049 hizo que la orden guardara la dirección de entrega, pero el checkout nunca pidió un correo
electrónico: si un pedido tiene un problema, el único contacto registrado es un teléfono. Y aunque
la orden guarda los siete campos de la dirección, la consulta de compras solo muestra el nombre y
el teléfono apretados en una misma celda, con el resto del dato invisible y espacio muerto en la
tabla. Buscar tampoco ayuda: `q` no mira el correo ni la dirección, así que localizar una orden por
la ciudad o por el correo de quien la hizo no es posible.

## What Changes

- El formulario de entrega pide **correo electrónico** como campo obligatorio, validado en el
  cliente y en el API. **BREAKING** para el contrato de `POST /orders`: una compra sin correo se
  rechaza con 400, igual que hoy se rechaza una sin dirección.
- La orden persiste el correo junto al resto de los datos de entrega (columna nueva + migración),
  como valor congelado en el momento de la compra.
- El detalle de la orden muestra el correo junto a la dirección y al teléfono.
- La consulta de compras muestra los datos de entrega que la orden guarda: destinatario, teléfono
  en **columna propia** con la bandera y la lada del país —la misma lectura que ofrece el campo de
  teléfono del formulario—, correo y dirección. El reparto de anchos deja de dejar espacio muerto.
- La búsqueda por texto de órdenes cubre además el correo y los campos de la dirección.
- El detalle de una orden ofrece **descargar su recibo en PDF**, el mismo que hoy solo se puede
  obtener en el diálogo que aparece al terminar la compra y que se pierde al cerrarlo.

## Capabilities

### New Capabilities

Ninguna. El cambio amplía capacidades existentes.

### Modified Capabilities

- `order-placement`: comprar exige también un correo de contacto, que queda guardado con la orden
  como dato congelado. Hoy el requisito nombra solo la dirección.
- `order-history`: la consulta y el detalle muestran los datos de entrega registrados —incluido el
  correo—, y el escenario que hoy niega mostrar "correo" pasa a distinguir el correo de contacto de
  la entrega, que la orden sí conoce, de una cuenta de cliente, que sigue sin existir.
- `order-search`: la búsqueda por texto acepta también el correo y la dirección del destinatario.
- `order-history` (segundo frente): el recibo deja de estar atado al momento de comprar y se puede
  descargar desde el detalle de la orden en cualquier momento.

## Impact

- **BE**: migración con la columna del correo; `CreateOrderDto` (validación de correo + saneado
  como el resto de campos de envío); `Order` entity; `orders.service` (búsqueda `q` sobre los
  campos nuevos); Swagger.
- **FE**: `address-new-form` (campo de correo + esquema zod), `checkout-payment` (envío del dato),
  tipos y mapper de `purchase`, detalle de la orden y columnas de la tabla de órdenes. El generador
  del recibo (`receipt.ts`, `receipt-document.tsx`) pasa de `sections/checkout/` a
  `sections/purchase/`, que es su dominio, y el checkout lo importa desde ahí.
- **Órdenes ya registradas**: no tienen correo. La columna en base de datos es nullable y la
  aplicación muestra ausencia explícita, sin bloquear su consulta.
- **Docs**: guía de pruebas manuales `docs/testing/` (TC-05 documenta el payload de `POST /orders`).
