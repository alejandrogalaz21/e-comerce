## 1. Traductor de errores de base de datos

- [x] 1.1 Crear en `api/src/common/filters/` el traductor de códigos de Postgres a excepciones HTTP
- [x] 1.2 Mapear `23505` a `409` con código `DUPLICATE_RESOURCE`, de forma única para todo el sistema
- [x] 1.3 Mapear `23503` a `409` con código `RESOURCE_IN_USE`, para que borrar un producto vendido deje de ser un `500`
- [x] 1.4 Registrar en el log el detalle de cualquier otro código y responder `500` genérico
- [x] 1.5 Cubrir el traductor con tests, incluida la ausencia de detalle en la respuesta

## 2. Exception filter global

- [x] 2.1 Crear el filter en `api/src/common/filters/` con el shape `statusCode`, `error`, `message`, `path`, `timestamp`
- [x] 2.2 Respetar el código propio de una excepción cuando ya lo trae, y derivarlo del estado HTTP cuando no
- [x] 2.3 Conservar al mismo nivel los campos extra de la excepción (`sku`, `requested`, `available`)
- [x] 2.4 Conservar `message` como string o como lista según lo produzca el origen
- [x] 2.5 Registrar completo en el log todo lo que no sea `HttpException` antes de responder `500`
- [x] 2.6 Registrar el filter globalmente en `api/src/main.ts`, junto al `ValidationPipe`

## 3. Retirar la lógica duplicada

- [x] 3.1 Eliminar `handleDBExceptions` de `products.service.ts` y usar el traductor común
- [x] 3.2 Eliminar `handleDBExceptions` de `users.service.ts` y usar el traductor común
- [x] 3.3 Comprobar que el `23505` de usuarios pasa de `400` a `409`, y ajustar sus tests
- [x] 3.4 Verificar que ninguna ruta devuelve ya `error.detail` de Postgres

## 4. Alinear los errores de dominio existentes

- [x] 4.1 Confirmar que el `409` de stock conserva `sku`, `requested` y `available` tras el filter
- [x] 4.2 Confirmar que el `402` de pago conserva su código `PAYMENT_DECLINED`
- [x] 4.3 Reunir los códigos en un único catálogo para que no se inventen por duplicado

## 5. Tests

- [x] 5.1 Cada estado representativo (`400`, `401`, `404`, `409`, `402`, `500`) devuelve los cinco campos
- [x] 5.2 `path` corresponde a la ruta pedida y `timestamp` es una fecha válida
- [x] 5.3 El `409` de stock conserva sus campos de detalle
- [x] 5.4 Varios mensajes de validación llegan como lista
- [x] 5.5 Un fallo inesperado no filtra detalle interno pero sí lo registra
- [x] 5.6 El mismo `23505` produce `409` tanto en productos como en usuarios
- [x] 5.7 Borrar un producto referenciado por una orden devuelve `409`, no `500`

## 6. Documentación y verificación

- [x] 6.1 Actualizar los ejemplos de error en Swagger de los controladores afectados
- [x] 6.2 Reflejar el contrato único en `docs/processes/` y en el README
- [x] 6.3 Ejecutar lint, typecheck y tests de `api/` y de `web/`
- [x] 6.4 Comprobar contra el stack levantado que las respuestas reales cumplen el contrato
- [x] 6.5 Verificar que el checkout del frontend sigue distinguiendo stock de pago rechazado
