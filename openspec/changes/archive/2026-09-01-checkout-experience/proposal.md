# Pasada de usabilidad sobre carrito y checkout (TK-057)

## Why

Al probar la app tras TK-055 aparecieron ocho hallazgos que comparten superficie —el carrito y los
tres pasos del checkout— y que por tiempo se resuelven en un solo cambio.

Dos son mentiras del sistema, no adornos: un producto **sin stock** se anunciaba con el color y las
palabras de un ajuste de cantidad, cuando en realidad bloquea la compra; y el método de pago era
decorado —la elección nunca salía del navegador—, de modo que "efectivo" se cobraba por el proveedor
simulado y la orden quedaba `PAID`, afirmando un dinero que nadie entregó.

El resto son fricciones que alargan el camino a la compra: un mini-carrito que bloqueaba el checkout
sin ofrecer cómo desbloquearlo, un resumen que pedía confirmar un cobro sin mostrar por qué,
teléfonos válidos rechazados por el autocompletado del navegador, y una retícula que cambiaba de
forma en cada paso.

## What Changes

- **Lo que bloquea se ve como bloqueo**: sin stock y retirado del catálogo en rojo; un precio que
  sube en ámbar y uno que baja en verde; un renombre sin alarma.
- **El carrito se corrige donde se lee**: cantidad y borrado por línea en el mini-carrito, y un
  botón de vaciar carrito en ambas superficies.
- **El resumen muestra las líneas** en los pasos de dirección y pago, no solo los totales. El paso
  de dirección pasa además a revalidar el carrito, que era el único que no lo hacía.
- **BREAKING** en `POST /orders`: `paymentMethod` (`card` | `paypal`) pasa a ser obligatorio y queda
  guardado con la orden, visible en su detalle y en el recibo. **El efectivo deja de ofrecerse**.
- **Cada producto se reconoce por su categoría**: el set de íconos aportado por el usuario sustituye
  al placeholder repetido, en galería, detalle, carrito, mini-carrito y resumen.
- **El teléfono acepta lo que el navegador autocompleta** y la bandera sigue al número.
- Los tres pasos del checkout comparten forma; se quita el checkbox de dirección por defecto, que no
  tenía dónde guardarse; el tema arranca en oscuro y sin modo compacto.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `order-placement`: comprar exige decir cómo se paga, y el número de contacto se acepta tal como lo
  entrega un autocompletado.
- `order-history`: el detalle y el recibo dicen con qué se pagó.
- `public-storefront`: el carrito se corrige sin salir de él, lo que bloquea se distingue de lo que
  solo cambia, y cada producto se reconoce por su categoría.

## Impact

- **BE**: migración `payment_method`, `PaymentMethod` enum, `CreateOrderDto`, entidad `Order`.
- **FE**: carrito y mini-carrito, los tres pasos del checkout, resumen, formulario de dirección,
  componente de teléfono, tarjeta y detalle de producto, recibo PDF, defaults del tema.
- **Órdenes anteriores**: sin método de pago. La columna es nullable y la aplicación lo dice.
- **Docs**: `TC-05`, `TC-06` y `MATRIX` (payload de `POST /orders`).
