## Context

Ocho hallazgos del usuario probando la app después de TK-055, todos sobre el carrito y los tres
pasos del checkout. Se agrupan en un cambio por tiempo, no porque compartan causa: conviene leer
cada decisión por separado.

Estado previo: el carrito ya se contrastaba con el catálogo (TK-055) y la orden ya guardaba los
datos de entrega (TK-054). El método de pago era un campo del formulario que no viajaba al API, y el
mini-carrito solo sabía listar.

## Goals / Non-Goals

**Goals:**

- Que la señal de un cambio corresponda a lo que le cuesta al comprador.
- Que cada pantalla que bloquea ofrezca ahí mismo cómo desbloquearse.
- Que la orden registre con qué se pagó, y que no se ofrezca lo que no se sabe modelar.
- Que un teléfono válido no se rechace por cómo lo escribió un autocompletado.

**Non-Goals:**

- Un estado para órdenes pagadas contra entrega. Se decidió **quitar el efectivo** en lugar de
  modelarlo: hacerlo bien pide un estado nuevo (`AWAITING_PAYMENT`) y una transición que lo saque de
  ahí, y un estado sin salida es peor que no tenerlo.
- Que el método de pago cambie el comportamiento del cobro. El proveedor simulado sigue rechazando
  al azar; lo que cambia es que la orden registre la elección.
- Un icono por producto. La representación es por categoría; el catálogo no tiene imágenes propias.
- Guardar `addressType` (Home/Office), que sigue sin persistirse.

## Decisions

### Cero unidades no es una cantidad ajustada

Un producto agotado se anunciaba con el mismo color y las mismas palabras que un recorte de
cantidad. Se separa: agotado y retirado son rojos y bloquean; un recorte que deja unidades sigue
siendo ámbar. El precio se colorea por dirección —ámbar si sube, verde si baja—, porque no le cuesta
lo mismo al comprador.

### La corrección vive en la pantalla que bloquea

El mini-carrito deshabilitaba el botón sin ofrecer forma de quitar la línea culpable, así que la
única salida era ir a otra pantalla. Gana cantidad y borrado por línea. Vaciar el carrito descarta
además la clave de idempotencia: conservarla ataría la siguiente compra al intento abandonado.

### El efectivo se retira en vez de fingirse

Con `paymentMethod` viajando al API, mantener efectivo obligaba a elegir entre dos mentiras: cobrarlo
por el proveedor simulado o registrarlo como pagado. Se retira, con el motivo escrito en el propio
código para que nadie lo reponga sin resolver antes el estado que le falta.

Alternativa considerada: `AWAITING_PAYMENT` como estado nuevo. Se descarta por alcance —cambia el
significado de los estados en el listado, el filtro y el recibo— y porque exige una acción de "marcar
como pagada" que este cambio no incluye.

### El teléfono se corrige por el texto crudo, y solo cuando es inequívoco

`react-phone-number-input` solo reporta lo que puede leer como número **nacional** del país
seleccionado, así que un `528134560078` autocompletado bajo bandera de EE. UU. nunca llegaba al
formulario. Se lee el texto crudo del input nativo y se promueve a internacional **solo** si no es
válido en el país seleccionado; de lo contrario un `4155552671` de San Francisco se convertiría en un
suizo. El valor se guarda canónico en E.164, lo que además hace predecible la búsqueda por teléfono
de TK-053.

La bandera dejó de congelarse al montar: se sincroniza cuando el valor parsea, y solo entonces, para
que un país elegido a mano sobreviva mientras se teclea.

### El set de íconos entra como TSX, no como JSX con tipos aparte

El archivo aportado se convierte a `.tsx` en lugar de acompañarlo de un `.d.ts`: el proyecto es
estricto y un `.jsx` obliga a desactivar `react/prop-types`, que fue exactamente lo que hizo fallar
el build del contenedor sin que los tests locales lo notaran.

La línea del carrito guarda `category` para poder dibujar el ícono; la reconciliación la rellena
sola en los carritos ya guardados.

### La misma forma en los tres pasos

Izquierda lo que se compra, derecha lo que este paso pide. El resumen ocupa el mismo lugar en los
tres, y la acción final vive siempre abajo a la derecha. Antes el resumen saltaba de columna entre
pasos y la columna ancha quedaba con un cuadro corto y mucho aire.

## Risks / Trade-offs

- **[Quitar el efectivo reduce lo que la tienda ofrece]** → Es deliberado: ofrecer un método que se
  registra como cobrado es peor que no ofrecerlo. Queda anotado cómo reponerlo bien.
- **[La corrección del teléfono podría reinterpretar un número]** → Acotada a lo que no es válido en
  el país seleccionado, y cubierta con tests para el caso de San Francisco.
- **[Los íconos asumen fondo oscuro]** → El tema arranca en oscuro; en claro se ven como tarjetas
  oscuras. Cambiarlo es editar el mapa de colores del propio set.
- **[Un cambio agrupado es más difícil de revisar y de revertir]** → Aceptado por tiempo; el detalle
  por hallazgo queda en el backlog y en este documento.
