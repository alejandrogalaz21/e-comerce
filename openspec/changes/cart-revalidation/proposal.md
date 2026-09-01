# Revalidar el carrito contra el catálogo antes de cobrar (TK-055)

## Why

El carrito vive en `localStorage` con el precio y el stock **congelados** en el momento de agregar,
y nada los vuelve a contrastar contra el catálogo: ni al recargar la página, ni al entrar al
checkout. Como `POST /orders` no acepta precios —el servidor los toma del catálogo—, cambiar el
precio de un producto que ya está en un carrito hace que se cobre el precio nuevo mientras la
pantalla mostró el viejo.

Eso no es una carencia, es un incumplimiento de un requisito vigente: `order-history` prohíbe
mostrar durante la compra un total distinto del que se registrará. El usuario lo reprodujo
agregando productos, cambiando el precio en el catálogo y recargando.

El disparador realista en esta app es el import CSV, que hace upsert por SKU y puede renombrar y
repreciar el catálogo entero de una pasada.

## What Changes

- El carrito y el checkout **revalidan sus líneas contra el catálogo** al abrirse, con
  `GET /products/:id` sobre los productos que contienen.
- Lo que cambia el trato se marca en la propia línea y no bloquea la compra:
  - **precio**: se adopta el actual y se muestra el anterior tachado junto al nuevo;
  - **stock insuficiente**: la cantidad se ajusta al disponible y se avisa, en vez de descubrirlo
    con el `409` del API;
  - **producto retirado del catálogo**: la línea se marca como no disponible con la acción de
    quitarla. Hoy esto es un `404 Product X not found` que el checkout presenta como un error
    genérico, sin decir qué línea sobra.
- Lo cosmético se actualiza sin alarma: **nombre y SKU** pasan al valor actual con una nota discreta
  en la línea. No cambian lo que se paga, y la orden los copia del catálogo al comprar, no del
  carrito.
- Un aviso agregado —"N productos cambiaron desde que los agregaste"— en el mini-carrito de la
  cabecera y en el paso de pago del checkout, que es el último momento en que se puede reaccionar.
- La línea del carrito guarda además el **SKU**, que hoy no lleva: sin él una línea no es
  identificable cuando su nombre cambia.

## Capabilities

### New Capabilities

Ninguna. El cambio corrige y amplía capacidades existentes.

### Modified Capabilities

- `public-storefront`: el carrito deja de ser una foto del momento en que se agregó cada producto y
  pasa a contrastarse con el catálogo, señalando lo que cambió.
- `order-placement`: una línea que el API rechazaría —producto inexistente o sin stock suficiente—
  se identifica antes de confirmar, en lugar de resolverse en un error que no dice qué línea sobra.

## Impact

- **FE**: `checkout-provider` (reconciliación de líneas y estado de "qué cambió"), `ICheckoutItem`
  (campo `sku`), mini-carrito de la cabecera, `checkout-cart-product`, `checkout-payment` y el
  resumen del pedido.
- **BE**: ninguno. El precio y el stock ya son datos públicos del catálogo.
- **Carritos ya guardados**: no tienen `sku`. La reconciliación lo rellena desde el catálogo en la
  primera revalidación, y su ausencia MUST NOT impedir que el carrito se abra.
