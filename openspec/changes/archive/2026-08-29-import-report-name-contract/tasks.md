## 1. Endurecer el contrato

- [x] 1.1 Quitar el `?` de `name` y `sku` en `ImportRejectedRow` e `ImportWarning` de `api/src/modules/import/import-result.interface.ts`
- [x] 1.2 Documentar en la interfaz que la cadena vacía significa «la celda del archivo estaba vacía» y que el campo nunca se omite
- [x] 1.3 Compilar el paquete `api/` y recoger la lista de puntos de construcción que el compilador señala

## 2. Corregir las rutas de rechazo y advertencia

- [x] 2.1 Propagar el nombre del DTO en `rejectDuplicateSkus` de `import.service.ts`
- [x] 2.2 Normalizar a cadena vacía el nombre y el SKU ausentes en las rutas de rechazo por validación
- [x] 2.3 Normalizar del mismo modo la ruta que genera advertencias por SKU existente
- [x] 2.4 Revisar que ninguna ruta restante construya estas filas sin ambos campos

## 3. Tests del módulo de import

- [x] 3.1 Cubrir que una fila rechazada por SKU duplicado llega con el nombre que traía el archivo
- [x] 3.2 Cubrir que una fila rechazada cuya celda de nombre venía vacía llega con cadena vacía y no con el campo ausente
- [x] 3.3 Cubrir que las advertencias por SKU existente llevan nombre y SKU
- [x] 3.4 Verificar con el CSV de ejemplo que las líneas rechazadas por duplicado (2, 11, 36, 56, 89) ya no pierden el nombre

## 4. Lado del cliente

- [x] 4.1 Confirmar que `name` y `sku` siguen opcionales en los tipos de `web/src/types/product.ts` y dejar anotado el motivo
- [x] 4.2 Abrir el detalle de un batch guardado antes de este change y confirmar que sigue renderizando con `—` en las celdas sin dato

## 5. Verificación

- [x] 5.1 Ejecutar lint, typecheck y tests del paquete `api/`
- [x] 5.2 Correr un import con el CSV de ejemplo y revisar el JSON del reporte contra los requisitos de la spec
