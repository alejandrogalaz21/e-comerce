## 1. Contrato de la línea del carrito

- [x] 1.1 Añadir `sku` a `ICheckoutItem`, y los campos de diferencia (`addedPrice`, `addedName`) que sostienen el "antes / ahora".
- [x] 1.2 Rellenar `sku` donde se construye una línea al agregar al carrito (ficha de producto y tienda), tolerando su ausencia en carritos ya guardados.

## 2. Reconciliación contra el catálogo

- [x] 2.1 Hook de revalidación en `sections/checkout`: recibe las líneas, pide cada producto con `getProduct` vía React Query y devuelve el resultado por línea (vigente, precio cambiado, nombre o SKU cambiados, stock insuficiente, retirada del catálogo, no verificable).
- [x] 2.2 Tratar el `404` como retirada del catálogo y un fallo de red como "no se pudo verificar", sin vaciar ni bloquear el carrito.
- [x] 2.3 Aplicar la reconciliación al estado del carrito: adoptar precio, nombre y SKU vigentes, ajustar la cantidad al stock disponible y conservar el valor con el que se agregó.
- [x] 2.4 Tests unitarios de la reconciliación: precio cambiado, nombre cambiado, stock insuficiente, producto retirado, producto sin cambios y respuesta fallida.

## 3. Presentación en el carrito y el checkout

- [x] 3.1 Ejecutar la revalidación al abrir el mini-carrito de la cabecera y al entrar al checkout.
- [x] 3.2 Marca por línea: precio anterior tachado junto al vigente, aviso de cantidad ajustada, y línea no disponible con acción de quitarla.
- [x] 3.3 Nota discreta en la línea cuando solo cambió el nombre o el SKU, sin tratarla como advertencia.
- [x] 3.4 Aviso agregado ("N productos cambiaron desde que los agregaste") en el mini-carrito y en el paso de pago, que se limpia al continuar.
- [x] 3.5 Aviso propio de "no se pudo verificar el carrito" cuando la revalidación falló por red.

## 4. Fallos de compra atribuibles a una línea

- [x] 4.1 Traducir el `404 Product ... not found` de `POST /orders` a un mensaje que nombre el producto, como ya se hace con el `409` de stock.
- [x] 4.2 Comprobar que el rechazo por stock agotado entre la revisión y la confirmación sigue mostrando producto, unidades pedidas y disponibles.

## 5. Cierre

- [x] 5.1 Caso manual en `docs/testing/`: agregar al carrito, cambiar precio y stock en el catálogo, borrar un producto, y verificar carrito y checkout.
- [x] 5.2 Dejar en verde `vitest`, `eslint` y `tsc` del web.
- [x] 5.3 Verificar en la app levantada el escenario que originó el ticket: carrito, cambio de precio, recarga, y que el total del checkout es el que se cobra.
