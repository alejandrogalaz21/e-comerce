## 1. Servicio de caché

- [ ] 1.1 Crear el servicio en `api/src/database/redis/`, junto al cliente existente
- [ ] 1.2 Componer la clave desde el DTO ya validado, con campos ordenados, no desde la URL cruda
- [ ] 1.3 Envolver lectura y escritura para que un fallo de Redis nunca propague
- [ ] 1.4 Aplicar un TTL como red de seguridad frente a invalidaciones perdidas
- [ ] 1.5 Exponer el borrado por prefijo para la invalidación

## 2. Integración en el catálogo

- [ ] 2.1 Servir `GET /products` desde caché cuando exista la entrada
- [ ] 2.2 Servir `GET /products/categories` con el mismo criterio
- [ ] 2.3 Invalidar el prefijo al crear, actualizar y borrar un producto
- [ ] 2.4 Invalidar una sola vez al cerrar un batch de import, no por fila
- [ ] 2.5 Comprobar que ninguna ruta autenticada ni de escritura pasa por la caché

## 3. Tests

- [ ] 3.1 Dos consultas idénticas solo consultan la base una vez
- [ ] 3.2 Consultas que difieren en un parámetro no comparten entrada
- [ ] 3.3 Peticiones equivalentes con parámetros en distinto orden sí comparten entrada
- [ ] 3.4 Crear, actualizar y borrar invalidan
- [ ] 3.5 Cerrar un import invalida una sola vez
- [ ] 3.6 Con la caché caída, la lectura se resuelve igual contra la base
- [ ] 3.7 Un fallo al guardar en caché no afecta a la respuesta

## 4. Verificación

- [ ] 4.1 Lint, typecheck y tests del paquete `api/`
- [ ] 4.2 Comprobar contra el stack que la respuesta cacheada es idéntica a la calculada
- [ ] 4.3 Comprobar que un import se refleja de inmediato en la tienda
