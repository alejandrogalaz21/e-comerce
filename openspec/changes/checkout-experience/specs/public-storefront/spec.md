## MODIFIED Requirements

### Requirement: Lo que cambia el trato se distingue de lo que no

El carrito SHALL señalar por separado los cambios que alteran lo que el visitante va a pagar o
recibir, y los que no.

Un cambio de precio, una cantidad que ya no cabe en el stock disponible y un producto retirado del
catálogo SHALL señalarse en la línea afectada, porque cambian el trato.

La señal SHALL corresponder a lo que el cambio le cuesta al visitante. Lo que impide comprar —un
producto agotado o retirado— MUST distinguirse de lo que solo encarece, y un precio que baja MUST
NOT presentarse con la misma alarma que uno que sube. Un producto sin unidades disponibles SHALL
decirse como tal y no como un ajuste de cantidad: cero unidades no es una cantidad menor, es una
compra que hoy no se puede hacer.

Un cambio de nombre o de SKU SHALL adoptarse sin presentarse como una advertencia: la orden copia
esos valores del catálogo al comprar, no del carrito, así que no alteran lo que se paga. La línea
SHALL dejar constancia de con qué nombre se agregó, para que siga siendo reconocible.

Señalar un cambio MUST NOT impedir comprar, salvo en aquello que el sistema rechazaría de todos
modos.

#### Scenario: Un producto renombrado

- **GIVEN** un carrito con un producto que después se renombra
- **WHEN** el visitante abre el carrito
- **THEN** la línea muestra el nombre vigente y deja constancia del que tenía al agregarse
- **AND** no se le advierte de un problema, porque no lo hay

#### Scenario: Se quiere comprar más de lo que queda

- **GIVEN** una línea con más unidades de las que el catálogo tiene disponibles
- **WHEN** el visitante abre el carrito
- **THEN** la cantidad se ajusta a lo disponible y se le dice que se ajustó

#### Scenario: El producto se agotó del todo

- **GIVEN** una línea de un producto que se quedó sin unidades
- **WHEN** el visitante abre el carrito
- **THEN** se le dice que está agotado y que hay que quitarlo para continuar
- **AND** no se le presenta como una cantidad ajustada a cero

#### Scenario: Un precio que baja y otro que sube

- **GIVEN** un carrito con un producto que bajó de precio y otro que subió
- **WHEN** el visitante abre el carrito
- **THEN** cada línea se señala de forma distinta según le cueste más o menos que al agregarla

#### Scenario: Comprar sigue siendo posible tras un cambio de precio

- **GIVEN** un carrito cuyo precio cambió
- **WHEN** el visitante decide continuar
- **THEN** puede confirmar la compra, y lo que se cobra es lo que la pantalla muestra

## ADDED Requirements

### Requirement: El carrito se corrige donde se lee

Cada superficie que muestre el carrito y permita avanzar desde ella SHALL permitir también
corregirlo: cambiar la cantidad de una línea, quitarla, y vaciar el carrito entero.

La aplicación MUST NOT bloquear el avance por una línea sin ofrecer, en esa misma pantalla, la forma
de resolverla. Un botón deshabilitado sin salida obliga a buscar otra pantalla para desbloquearse.

Cambiar una cantidad SHALL respetar el stock disponible, del mismo modo que lo respeta la lista de
la compra.

Vaciar el carrito SHALL terminar ese intento de compra por completo, de manera que la siguiente
compra no quede atada al intento abandonado.

#### Scenario: Una línea bloquea la compra desde el carrito de la cabecera

- **GIVEN** un carrito abierto desde la cabecera con un producto que ya no se puede comprar
- **WHEN** el visitante ve que no puede continuar
- **THEN** puede quitar esa línea sin salir de ahí, y entonces continuar

#### Scenario: Ajustar cantidades sin llegar al límite del stock

- **WHEN** el visitante sube la cantidad de una línea hasta el stock disponible
- **THEN** no puede subirla más

#### Scenario: Vaciar el carrito y volver a comprar

- **GIVEN** un carrito con productos
- **WHEN** el visitante lo vacía y más tarde compra otra cosa
- **THEN** el carrito queda vacío
- **AND** la compra siguiente se registra como un intento nuevo, no como el que se abandonó

### Requirement: Cada producto se reconoce por su categoría

Mientras el catálogo no tenga imágenes propias, cada producto SHALL presentarse con una
representación derivada de su categoría, y no con la misma imagen de relleno repetida.

Esa representación SHALL ser la misma allí donde el producto aparezca —catálogo, ficha, carrito y
resumen de compra—, de modo que se le reconozca de un vistazo a lo largo del proceso.

Una categoría desconocida o ausente SHALL recibir una representación de reserva; el sistema MUST NOT
quedarse sin nada que mostrar.

#### Scenario: Reconocer un producto a lo largo de la compra

- **GIVEN** un producto de una categoría conocida
- **WHEN** el visitante lo ve en el catálogo, abre su ficha y luego lo mira en el carrito
- **THEN** lo acompaña la misma representación en los tres sitios

#### Scenario: Una categoría que el sistema no conoce

- **GIVEN** un producto cuya categoría no corresponde a ninguna conocida
- **WHEN** se muestra en cualquier pantalla
- **THEN** se le da la representación de reserva, y no un hueco vacío
