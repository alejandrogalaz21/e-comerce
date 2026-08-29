## ADDED Requirements

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
