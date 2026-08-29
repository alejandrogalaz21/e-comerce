## ADDED Requirements

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
