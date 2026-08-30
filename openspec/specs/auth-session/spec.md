# auth-session Specification

## Purpose

Define cómo un administrador obtiene y conserva una sesión: con qué credenciales se autentica, qué usuario existe desde el arranque para que el evaluador entre sin fricción, qué habilita el token frente a los endpoints protegidos, y cómo la sesión sobrevive a una recarga y se cierra.
## Requirements
### Requirement: Autenticación con credenciales

El sistema SHALL permitir a un usuario registrado iniciar sesión con email y contraseña, y
devolver un token JWT que identifique la sesión. La contraseña MUST NOT viajar nunca en la
respuesta.

#### Scenario: Credenciales válidas

- **WHEN** se envía `POST /api/v1/auth/sign-in` con el email y la contraseña de un usuario existente
- **THEN** la respuesta es 200 e incluye un token de acceso y los datos públicos del usuario, sin el campo `password`

#### Scenario: Contraseña incorrecta

- **WHEN** se envía `POST /api/v1/auth/sign-in` con un email existente y una contraseña que no corresponde
- **THEN** la respuesta es 401 y no incluye token

#### Scenario: Email inexistente

- **WHEN** se envía `POST /api/v1/auth/sign-in` con un email que no está registrado
- **THEN** la respuesta es 401 con un mensaje que no revela si el email existe

### Requirement: Usuario demo disponible desde el arranque

El sistema SHALL disponer de un usuario de demostración creado por migración idempotente, para
que la aplicación sea usable tras `docker compose up` sin pasos manuales.

#### Scenario: Login con el usuario demo en una base recién creada

- **WHEN** se levanta el stack sobre un volumen vacío y se hace sign-in con `demo@demo.com` / `demo`
- **THEN** la autenticación es exitosa y devuelve un token válido

#### Scenario: Re-ejecución de migraciones

- **WHEN** las migraciones se ejecutan de nuevo sobre una base que ya contiene el usuario demo
- **THEN** no se crea un duplicado ni falla la migración

### Requirement: Token válido para peticiones protegidas

El sistema SHALL aceptar el token emitido en el header `Authorization: Bearer <token>` para
autorizar peticiones a endpoints protegidos, y SHALL rechazar tokens ausentes, malformados,
firmados con otra clave o expirados.

#### Scenario: Petición con token válido

- **WHEN** se llama a un endpoint protegido incluyendo un token emitido por el sistema y vigente
- **THEN** la petición se procesa normalmente y el usuario autenticado queda disponible para el handler

#### Scenario: Token manipulado o firmado con otra clave

- **WHEN** se llama a un endpoint protegido con un token cuya firma no valida
- **THEN** la respuesta es 401 y la operación no se ejecuta

#### Scenario: Token expirado

- **WHEN** se llama a un endpoint protegido con un token cuya fecha de expiración ya pasó
- **THEN** la respuesta es 401

### Requirement: Persistencia y restauración de la sesión en el cliente

El frontend SHALL persistir la sesión iniciada de modo que sobreviva a recargas de página, y
SHALL restaurarla al arrancar la aplicación sin pedir credenciales de nuevo.

#### Scenario: Recarga con sesión activa

- **WHEN** el usuario inicia sesión y recarga la página
- **THEN** sigue autenticado y accede al dashboard sin volver a introducir credenciales

#### Scenario: Arranque sin sesión previa

- **WHEN** se abre la aplicación en un navegador sin sesión almacenada
- **THEN** la aplicación queda en estado no autenticado sin errores en consola

### Requirement: Cierre de sesión

El sistema SHALL permitir cerrar la sesión, eliminando el token almacenado y dejando la
aplicación en estado no autenticado.

#### Scenario: Logout desde el dashboard

- **WHEN** el usuario autenticado ejecuta la acción de cerrar sesión
- **THEN** el token deja de enviarse en las peticiones y el acceso a rutas protegidas vuelve a exigir login

### Requirement: La pantalla de acceso no ofrece registro

El sistema SHALL presentar el acceso sin ofrecer crear una cuenta, dado que opera con un usuario
sembrado. Las direcciones de registro MUST llevar al acceso en lugar de mostrar un formulario que
no corresponde al alcance del proyecto.

#### Scenario: Mirar la pantalla de acceso

- **WHEN** un visitante abre la pantalla de acceso
- **THEN** no encuentra ninguna invitación a registrarse

#### Scenario: Abrir la dirección de registro a mano

- **WHEN** se escribe directamente la dirección de registro
- **THEN** se acaba en la pantalla de acceso

### Requirement: Desde el acceso se puede volver a la tienda

La pantalla de acceso SHALL ofrecer una salida hacia la tienda, para que quien llegue por error no
quede sin camino de vuelta.

#### Scenario: Llegar por error

- **WHEN** un visitante abre la pantalla de acceso sin querer entrar
- **THEN** encuentra un enlace que le devuelve a la tienda

