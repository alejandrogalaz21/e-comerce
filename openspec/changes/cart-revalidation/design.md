## Context

El carrito es estado local del navegador: `CheckoutProvider` lo guarda en `localStorage` bajo la
clave `app-checkout` con `useLocalStorage`, y cada línea (`ICheckoutItem`) lleva `id`, `name`,
`price`, `quantity`, `stock` y `coverUrl`. El subtotal se recalcula sumando `quantity * price` sobre
esas líneas, así que el precio que manda es el que se copió al agregar.

Nada revalida. `POST /orders` recibe únicamente `{ productId, quantity }` y deriva el importe del
catálogo, de modo que el cobro es correcto y lo que miente es la pantalla. El API también resuelve
los dos rechazos por línea: `404 Product X not found` y `409` por stock insuficiente con `sku`,
`requested` y `available`; el checkout traduce el `409` a un mensaje con producto y unidades, pero
el `404` cae en el genérico "The order could not be placed".

En el catálogo, `GET /products/:id` es público y devuelve `name`, `sku`, `price` y `stock`. La app
ya lo consume con React Query (`getProduct` en `actions/product.ts`).

## Goals / Non-Goals

**Goals:**

- Que el precio, el stock, el nombre y el SKU que el carrito muestra sean los del catálogo cada vez
  que el visitante lo abre o entra al checkout.
- Que el total mostrado sea el que se va a cobrar, que es lo que `order-history` ya exige.
- Que una línea que el API rechazaría se identifique antes de confirmar.
- Distinguir en pantalla lo que cambia el trato de lo que es cosmético.

**Non-Goals:**

- Reservar stock. Un carrito no aparta unidades, y la verificación del servidor sigue siendo la que
  decide en la confirmación.
- Un `POST /orders/quote`. El precio y el stock ya son datos públicos del catálogo; un endpoint de
  cotización se justificaría con descuentos o impuestos, que no existen.
- Sincronización en vivo (polling, websockets) mientras el carrito está abierto. Se revalida al
  abrir y al entrar al proceso de compra, que son los momentos en que el visitante decide.
- Historial de cambios de precio de un producto. Solo interesa la diferencia contra lo que el
  visitante aceptó.

## Decisions

### Se revalida al abrir el carrito y al entrar al checkout, no al escribir en él

Los dos momentos en que el visitante mira precios y decide. Revalidar en cada `onAddToCart` o en
cada cambio de cantidad multiplicaría peticiones sin cambiar ninguna decisión suya.

Alternativa considerada: revalidar solo en el paso de pago. Se descarta porque el mini-carrito
también muestra un subtotal, y sería un subtotal que se corrige al avanzar — el mismo defecto, un
paso después.

### Se piden los productos uno a uno con `GET /products/:id`

Un carrito tiene unas pocas líneas, no cientos, y React Query deduplica y cachea por id. Evita
inventar un endpoint por lotes para un problema que no lo pide.

Alternativa considerada: `GET /products?q=...` con los SKU. Se descarta: `q` hace OR sobre nombre y
SKU con coincidencia parcial, así que podría traer productos que no están en el carrito y perder los
que no coincidan; el id es exacto por definición.

Un producto que responde `404` no es un error de carga: es la señal de que se retiró del catálogo, y
así se trata. Un fallo de red sí es un error, y en ese caso el carrito se muestra con los valores
guardados y se dice que no se pudo verificar, en vez de vaciarlo o bloquearlo.

### La reconciliación se guarda como diferencia, no como sustitución silenciosa

Cada línea revalidada guarda el valor vigente y el que tenía al agregarse (`addedPrice`,
`addedName`), que es lo que permite mostrar "antes / ahora" y contar cuántas líneas cambiaron. Sin
ese par, la única forma de avisar sería recordar un booleano "algo cambió", que no puede explicar
qué.

La marca se limpia cuando el visitante ve el carrito y continúa: es un aviso de "esto cambió desde
tu última visita", no un estado permanente de la línea.

### El SKU entra en la línea del carrito

`ICheckoutItem` gana `sku`. Hoy la línea se identifica por `id` —un UUID que no se muestra— y por
`name`, que es justo lo que puede cambiar. Los carritos ya guardados no lo tienen: la primera
revalidación lo rellena desde el catálogo, y su ausencia no impide abrir el carrito.

### La cantidad se ajusta al stock, el precio no se pregunta

Si el stock disponible es menor que la cantidad de la línea, se baja la cantidad y se avisa: es lo
que el API haría con un `409`, adelantado. El precio, en cambio, se adopta sin preguntar — no hay
alternativa que ofrecer, porque comprar al precio viejo no es algo que el sistema pueda cumplir.

## Risks / Trade-offs

- **[La revalidación introduce una espera al abrir el carrito]** → Se pintan los valores guardados
  de inmediato y se corrigen al llegar la respuesta, con la marca de cambio; el carrito nunca queda
  en blanco esperando.
- **[Un producto borrado y uno inalcanzable por red se parecen]** → Se distinguen por la respuesta:
  `404` es retirada del catálogo, un fallo de red es fallo de verificación, y cada uno dice lo suyo.
  Confundirlos vaciaría carritos por un corte de red.
- **[Sigue habiendo una ventana entre revisar y confirmar]** → Es inevitable sin reservar stock, y
  el rechazo del servidor la cubre. El spec lo dice explícitamente para que no se lea como un hueco.
- **[Ajustar la cantidad automáticamente modifica lo que el visitante puso]** → Se avisa en la línea,
  y la alternativa —dejarla y que el `409` la rechace al confirmar— es peor: el mismo cambio, pero
  después de intentar pagar.
