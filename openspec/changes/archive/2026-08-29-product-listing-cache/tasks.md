## 1. Servicio de caché

- [x] 1.1 Crear el servicio en `api/src/database/redis/`, junto al cliente existente
- [x] 1.2 Componer la clave desde el DTO ya validado, con campos ordenados, no desde la URL cruda
- [x] 1.3 Envolver lectura y escritura para que un fallo de Redis nunca propague
- [x] 1.4 Aplicar un TTL como red de seguridad frente a invalidaciones perdidas
- [x] 1.5 Exponer el borrado por prefijo para la invalidación

## 2. Integración en el catálogo

- [x] 2.1 Servir `GET /products` desde caché cuando exista la entrada
- [x] 2.2 Servir `GET /products/categories` con el mismo criterio
- [x] 2.3 Invalidar el prefijo al crear, actualizar y borrar un producto
- [x] 2.4 Invalidar una sola vez al cerrar un batch de import, no por fila
- [x] 2.5 Comprobar que ninguna ruta autenticada ni de escritura pasa por la caché

## 3. Tests

- [x] 3.1 Dos consultas idénticas solo consultan la base una vez
- [x] 3.2 Consultas que difieren en un parámetro no comparten entrada
- [x] 3.3 Peticiones equivalentes con parámetros en distinto orden sí comparten entrada
- [x] 3.4 Crear, actualizar y borrar invalidan
- [x] 3.5 Cerrar un import invalida una sola vez
- [x] 3.6 Con la caché caída, la lectura se resuelve igual contra la base
- [x] 3.7 Un fallo al guardar en caché no afecta a la respuesta

## 4. Verificación

- [x] 4.1 Lint, typecheck y tests del paquete `api/`
- [x] 4.2 Comprobar contra el stack que la respuesta cacheada es idéntica a la calculada
- [x] 4.3 Comprobar que un import se refleja de inmediato en la tienda
