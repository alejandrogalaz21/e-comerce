## 1. Señales del carrito

- [x] 1.1 Distinguir agotado de cantidad ajustada, en rojo y con su propio texto.
- [x] 1.2 Colorear el cambio de precio por dirección: ámbar si sube, verde si baja.
- [x] 1.3 El aviso agregado pasa a rojo cuando alguna línea impide comprar.
- [x] 1.4 Test de reconciliación para una línea que se queda sin stock.

## 2. Corregir el carrito donde se lee

- [x] 2.1 Cantidad y borrado por línea en el mini-carrito, validando contra el stock.
- [x] 2.2 Vaciar carrito en el mini-carrito y en el paso Cart, descartando la clave de idempotencia.

## 3. Método de pago

- [x] 3.1 Migración `payment_method`, enum `PaymentMethod` y campo en la entidad `Order`.
- [x] 3.2 `paymentMethod` obligatorio y validado en `CreateOrderDto`, persistido al crear la orden.
- [x] 3.3 Quitar el efectivo del checkout, dejando escrito el motivo en el código.
- [x] 3.4 Enviar el método desde el formulario y mostrarlo en el detalle de la orden y en el recibo PDF.
- [x] 3.5 Tests del DTO: sin método, método desconocido, y los dos válidos.

## 4. Resumen y layout

- [x] 4.1 Listar las líneas en el resumen de los pasos de dirección y pago.
- [x] 4.2 Revalidar el carrito también en el paso de dirección.
- [x] 4.3 Misma retícula en los tres pasos: lo comprado a la izquierda, la acción del paso a la derecha.

## 5. Íconos por categoría

- [x] 5.1 Convertir el set aportado de `.jsx` a `.tsx` con sus tipos.
- [x] 5.2 Guardar `category` en la línea del carrito y rellenarlo en la reconciliación.
- [x] 5.3 Usar el ícono en galería, ficha, fila del carrito, mini-carrito y resumen.

## 6. Teléfono y formulario

- [x] 6.1 Sincronizar la bandera con el valor cuando el número parsea.
- [x] 6.2 Promover el texto crudo a internacional solo si no es válido en el país seleccionado.
- [x] 6.3 Guardar el teléfono canónico en E.164, con tests del normalizador.
- [x] 6.4 Quitar el checkbox de dirección por defecto y el chip que lo mostraba.

## 7. Cierre

- [x] 7.1 Defaults del tema: oscuro encendido, compacto apagado.
- [x] 7.2 Actualizar `TC-05`, `TC-06` y `MATRIX` con el payload vigente de `POST /orders`.
- [x] 7.3 Dejar en verde los tests del API y del web, eslint y tsc, y verificar en la app levantada.
