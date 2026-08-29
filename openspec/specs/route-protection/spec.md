# route-protection Specification

## Purpose

Define la frontera de acceso del sistema: navegar el catálogo y comprar son públicos, mientras que gestionar el catálogo, importar, consultar el historial y los endpoints operativos exigen sesión. Incluye cómo el cliente maneja el token y su expiración.

## Requirements
### Requirement: La tienda y la compra permanecen públicas

El sistema SHALL permitir navegar el catálogo, ver el detalle de un producto y completar una
compra sin sesión iniciada. Un comprador MUST NOT necesitar cuenta para adquirir productos.

#### Scenario: Listado de catálogo sin sesión

- **WHEN** se solicita `GET /api/v1/products` sin header `Authorization`
- **THEN** la respuesta es 200 con el envelope paginado de productos

#### Scenario: Detalle de producto sin sesión

- **WHEN** se solicita `GET /api/v1/products/:id` de un producto existente sin sesión
- **THEN** la respuesta es 200 con el producto

#### Scenario: Compra sin cuenta

- **WHEN** un visitante sin sesión completa el flujo de compra desde la tienda pública
- **THEN** la orden se procesa sin exigir autenticación

#### Scenario: Rutas públicas del frontend

- **WHEN** un visitante sin sesión navega a la tienda, al detalle de un producto o al checkout
- **THEN** las páginas se renderizan con normalidad y no se le redirige a login

### Requirement: La gestión de productos exige sesión

El sistema SHALL rechazar con 401 toda operación de alta, modificación o borrado de productos que
llegue sin un token válido.

#### Scenario: Alta de producto sin token

- **WHEN** se envía `POST /api/v1/products` con un cuerpo válido pero sin header `Authorization`
- **THEN** la respuesta es 401 y el producto no se crea

#### Scenario: Modificación sin token

- **WHEN** se envía `PATCH /api/v1/products/:id` sin token
- **THEN** la respuesta es 401 y el producto permanece sin cambios

#### Scenario: Borrado sin token

- **WHEN** se envía `DELETE /api/v1/products/:id` sin token
- **THEN** la respuesta es 401 y el producto sigue existiendo

#### Scenario: Alta con sesión válida

- **WHEN** un usuario autenticado envía `POST /api/v1/products` con un cuerpo válido
- **THEN** el producto se crea y la respuesta es 201

### Requirement: El import de catálogo y su historial exigen sesión

El sistema SHALL exigir sesión para subir un CSV de productos y para consultar el historial y el
detalle de los batches de importación, por ser datos operativos internos.

#### Scenario: Import sin token

- **WHEN** se envía `POST /api/v1/products/import` con un archivo válido pero sin token
- **THEN** la respuesta es 401 y no se crea ningún batch ni se modifica el catálogo

#### Scenario: Consulta de historial sin token

- **WHEN** se solicita el listado o el detalle de batches sin token
- **THEN** la respuesta es 401

#### Scenario: Import con sesión válida

- **WHEN** un usuario autenticado sube un CSV válido
- **THEN** el import se procesa y devuelve el resumen del batch

### Requirement: Los endpoints operativos internos exigen sesión

El sistema SHALL proteger los endpoints de diagnóstico de infraestructura y la administración de
usuarios. El endpoint de health MUST permanecer público para que la orquestación y el monitoreo
puedan consultarlo sin credenciales.

#### Scenario: Diagnóstico sin token

- **WHEN** se solicitan los endpoints de estado de base de datos o caché sin token
- **THEN** la respuesta es 401

#### Scenario: Administración de usuarios sin token

- **WHEN** se solicita cualquier operación del módulo de usuarios sin token
- **THEN** la respuesta es 401

#### Scenario: Health público

- **WHEN** se solicita `GET /api/v1/health` sin token
- **THEN** la respuesta es 200 con el estado de la aplicación

### Requirement: El dashboard del frontend está tras el guard de sesión

El frontend SHALL exigir sesión para todas las rutas bajo `/dashboard`, y SHALL redirigir a la
pantalla de login preservando el destino solicitado para volver a él tras autenticarse.

#### Scenario: Acceso al dashboard sin sesión

- **WHEN** un visitante sin sesión navega a una ruta bajo `/dashboard`
- **THEN** se le redirige a la pantalla de sign-in en lugar de mostrar la pantalla protegida

#### Scenario: Retorno al destino tras el login

- **WHEN** un visitante sin sesión intenta abrir una ruta concreta del dashboard y luego inicia sesión correctamente
- **THEN** aterriza en la ruta que había solicitado originalmente

#### Scenario: Acceso con sesión activa

- **WHEN** un usuario autenticado navega a cualquier ruta del dashboard
- **THEN** la pantalla se muestra sin redirección

### Requirement: Manejo del token y de la expiración en el cliente

El frontend SHALL adjuntar automáticamente el token de sesión a las peticiones al API, y ante una
respuesta 401 SHALL limpiar la sesión y enviar al usuario a la pantalla de login.

#### Scenario: Token adjuntado automáticamente

- **WHEN** un usuario autenticado ejecuta una acción que llama a un endpoint protegido
- **THEN** la petición incluye el header `Authorization: Bearer <token>` sin que cada pantalla lo gestione

#### Scenario: Sesión caducada durante el uso

- **WHEN** el API responde 401 a una petición del dashboard por token expirado o inválido
- **THEN** la sesión local se limpia y el usuario es enviado a la pantalla de sign-in

