## MODIFIED Requirements

### Requirement: El carrito acompaña al visitante

El acceso al carrito SHALL estar disponible en toda la tienda, incluida la ficha de un producto, y
MUST indicar cuántos artículos contiene.

El carrito SHALL contrastarse con el catálogo cada vez que se abre y al entrar al proceso de compra.
La aplicación MUST NOT presentar como vigente un precio o una disponibilidad que el catálogo ya no
sostiene: un carrito conservado entre visitas es un recuerdo, no una reserva.

Cada línea SHALL ser identificable por sí misma, con independencia de cómo se llame su producto en
cada momento.

#### Scenario: Entrar a la ficha de un producto

- **GIVEN** un carrito con artículos
- **WHEN** el visitante abre la ficha de un producto
- **THEN** el carrito sigue accesible y sigue indicando cuántos artículos lleva

#### Scenario: Ver el carrito sin salir de donde se está

- **WHEN** el visitante abre el carrito desde la cabecera
- **THEN** ve sus líneas con cantidades y puede pasar al checkout desde ahí

#### Scenario: Carrito vacío

- **WHEN** el visitante abre el carrito sin artículos
- **THEN** se le dice que está vacío en lugar de mostrarle una lista en blanco

#### Scenario: El precio cambió mientras el carrito esperaba

- **GIVEN** un carrito con un producto cuyo precio cambió después de agregarlo
- **WHEN** el visitante abre el carrito o el proceso de compra
- **THEN** la línea muestra el precio vigente y también el que tenía al agregarse
- **AND** el total refleja el precio vigente

#### Scenario: El catálogo se recarga entero mientras hay carritos abiertos

- **GIVEN** un carrito con varios productos
- **WHEN** una importación cambia precios y nombres de esos productos y el visitante vuelve al carrito
- **THEN** se le dice cuántas de sus líneas cambiaron, sin tener que compararlas una por una

## ADDED Requirements

### Requirement: Lo que cambia el trato se distingue de lo que no

El carrito SHALL señalar por separado los cambios que alteran lo que el visitante va a pagar o
recibir, y los que no.

Un cambio de precio, una cantidad que ya no cabe en el stock disponible y un producto retirado del
catálogo SHALL señalarse en la línea afectada, porque cambian el trato.

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

#### Scenario: Comprar sigue siendo posible tras un cambio de precio

- **GIVEN** un carrito cuyo precio cambió
- **WHEN** el visitante decide continuar
- **THEN** puede confirmar la compra, y lo que se cobra es lo que la pantalla muestra
