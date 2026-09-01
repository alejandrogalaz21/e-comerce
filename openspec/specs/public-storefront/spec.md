# public-storefront Specification

## Purpose

Define qué encuentra un visitante sin cuenta al entrar: cómo busca, filtra y pagina el catálogo, cómo se representa una categoría de texto libre, cómo el carrito le acompaña por el sitio, y qué ofrece la cabecera según haya sesión.
## Requirements
### Requirement: La tienda es la puerta de entrada

La dirección raíz del sitio SHALL mostrar el catálogo. Un visitante sin cuenta MUST poder ver los
productos sin ningún paso previo.

#### Scenario: Entrar al sitio

- **WHEN** un visitante abre la dirección raíz
- **THEN** ve la tienda con productos, sin redirecciones intermedias ni pantallas de acceso

#### Scenario: La dirección anterior sigue funcionando

- **WHEN** se abre un enlace guardado que apuntaba a la antigua ruta de la tienda
- **THEN** acaba en la tienda igualmente

### Requirement: El visitante busca, filtra y pagina el catálogo

La tienda SHALL permitir buscar por texto, acotar por categoría y recorrer el catálogo por páginas.
La búsqueda y el filtrado MUST resolverse en el servidor, no sobre la página visible.

Cuando no haya nada que mostrar, la tienda SHALL distinguir entre un catálogo vacío y una consulta
sin coincidencias, porque exigen acciones opuestas: en el primer caso no hay nada que buscar y hay
que cargar productos; en el segundo hay catálogo y lo que sobra es el criterio aplicado.

Ante un catálogo vacío, la tienda SHALL indicar que todavía no hay productos y orientar sobre cómo
cargarlos. Ante una consulta sin coincidencias, la tienda SHALL nombrar el criterio que no encontró
nada y ofrecer descartarlo.

#### Scenario: Buscar un producto que no está en la primera página

- **WHEN** el visitante busca un producto que quedaría fuera de la primera página
- **THEN** aparece igualmente

#### Scenario: Acotar por categoría

- **WHEN** el visitante elige una categoría
- **THEN** solo ve productos de esa categoría, y puede quitarla para volver al catálogo completo

#### Scenario: Recorrer el catálogo

- **GIVEN** más productos de los que caben en una página
- **WHEN** el visitante avanza de página
- **THEN** ve productos distintos de los anteriores

#### Scenario: El catálogo está vacío

- **GIVEN** un catálogo sin ningún producto
- **WHEN** el visitante abre la tienda sin haber buscado ni filtrado
- **THEN** se le dice que todavía no hay productos y se le orienta sobre cómo cargarlos
- **AND** no se le dice que su búsqueda no encontró resultados, porque no buscó nada

#### Scenario: La búsqueda no encuentra nada

- **GIVEN** un catálogo con productos
- **WHEN** el visitante busca un texto que ningún producto contiene
- **THEN** se le dice que esa búsqueda no encontró resultados, nombrando lo que buscó
- **AND** puede descartar la búsqueda para volver al catálogo completo

#### Scenario: La categoría elegida no tiene productos

- **GIVEN** un catálogo con productos
- **WHEN** el visitante elige una categoría sin productos
- **THEN** se le dice que esa categoría no tiene productos, nombrándola
- **AND** puede quitarla para volver al catálogo completo

### Requirement: Lo que el visitante está mirando vive en la dirección

La búsqueda, la categoría y la página SHALL formar parte de la dirección, de modo que el botón atrás
funcione y un enlace compartido reproduzca la misma vista.

#### Scenario: Volver atrás

- **WHEN** el visitante filtra y pulsa atrás
- **THEN** vuelve a lo que veía antes, en lugar de abandonar la tienda

#### Scenario: Compartir lo que se está viendo

- **WHEN** se abre en otro sitio el enlace de una tienda filtrada
- **THEN** se muestra el mismo subconjunto

### Requirement: Cada categoría se reconoce de un vistazo

Una tarjeta de producto SHALL representar su categoría con un icono propio. Como la categoría es
texto libre, el sistema MUST mostrar un icono de reserva para cualquier valor que no reconozca, y
MUST NOT dejar la tarjeta rota ni vacía.

#### Scenario: Categoría conocida

- **WHEN** un producto pertenece a una categoría habitual del catálogo
- **THEN** su tarjeta muestra un icono que la representa

#### Scenario: Categoría desconocida

- **WHEN** un producto llega con una categoría que el sistema no tiene mapeada
- **THEN** la tarjeta muestra el icono de reserva y se ve igual de correcta

#### Scenario: Mismo nombre escrito distinto

- **WHEN** dos productos traen la misma categoría con distinta capitalización o espacios sobrantes
- **THEN** ambos muestran el mismo icono

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

### Requirement: La cabecera refleja si hay sesión

La cabecera SHALL ofrecer acceder cuando no hay sesión y acceso al área de gestión cuando la hay.
MUST NOT ofrecer una acción que el sistema vaya a rechazar acto seguido.

#### Scenario: Visitante sin sesión

- **WHEN** un visitante sin sesión mira la cabecera
- **THEN** encuentra la opción de acceder, y no un enlace al área de gestión que le rebotaría

#### Scenario: Usuario con sesión

- **WHEN** un usuario con sesión mira la cabecera
- **THEN** encuentra el acceso al área de gestión

### Requirement: El comprador puede llevarse el recibo

Al completar una compra, el sistema SHALL ofrecer descargar un recibo con los datos de la orden
realmente registrada. La acción MUST producir un archivo, no quedarse sin efecto.

#### Scenario: Descargar el recibo

- **WHEN** el comprador pide el recibo en la pantalla de confirmación
- **THEN** obtiene un documento con el identificador de la orden, sus líneas y el total

#### Scenario: El recibo refleja la orden registrada

- **WHEN** se compara el recibo con la orden almacenada
- **THEN** coinciden en líneas, cantidades y total

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
