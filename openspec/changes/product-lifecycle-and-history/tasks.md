## 1. Esquema

- [ ] 1.1 Migración `product-discontinued-at`: añade `products.discontinued_at timestamptz` nullable, con `down` que la elimina
- [ ] 1.2 Migración `product-history`: crea la tabla `product_history` (`id`, `product_id` uuid **sin FK**, `sku`, `operation`, `changed_at`, `old_data` jsonb, `new_data` jsonb, `changed_fields` text[]) con índice por `(product_id, changed_at DESC)`
- [ ] 1.3 En la misma migración, la función `record_product_history()` y el trigger `AFTER INSERT OR UPDATE OR DELETE ON products FOR EACH ROW`, con guarda `OLD IS DISTINCT FROM NEW` en el `UPDATE` para no registrar escrituras que no cambian nada
- [ ] 1.4 `down` de 1.2 borra trigger, función y tabla, en ese orden
- [ ] 1.5 Levantar el stack y comprobar que ambas migraciones corren en un arranque limpio

## 2. Entidades y contratos

- [ ] 2.1 `Product` gana `discontinuedAt: Date | null` con su `@ApiProperty`
- [ ] 2.2 Nueva entidad `ProductHistory` en `modules/products/entities/`, mapeada a la tabla, solo lectura
- [ ] 2.3 `ProductFiltersDto` gana `status?: 'active' | 'discontinued' | 'all'` con `@IsEnum`, default `active`, y ejemplo en Swagger
- [ ] 2.4 Registrar `ProductHistory` en `TypeOrmModule.forFeature` de `ProductsModule`

## 3. Servicio de productos

- [ ] 3.1 `findAll` aplica el filtro de estado: `active` → `discontinued_at IS NULL`, `discontinued` → `IS NOT NULL`, `all` → sin condición
- [ ] 3.2 `findOne` excluye los retirados y lanza `NotFoundException`, de modo que la ruta pública responda 404
- [ ] 3.3 Nuevo `findOneIncludingDiscontinued` para uso interno de discontinue/restore
- [ ] 3.4 `findCategories` cuenta solo productos a la venta y omite las categorías que se quedan en cero
- [ ] 3.5 `discontinue(id)`: idempotente, conserva la fecha original si ya estaba retirado, invalida la caché
- [ ] 3.6 `restore(id)`: idempotente, invalida la caché
- [ ] 3.7 `remove(id)` no cambia: sigue siendo borrado duro y sigue traduciendo la violación de FK a 409
- [ ] 3.8 `findHistory(id, filtros)`: paginado, `changed_at DESC`, 404 si el identificador no corresponde a ningún producto **ni a ninguna entrada de historial**

## 4. Controlador y documentación de API

- [ ] 4.1 `PATCH /products/:id/discontinue` y `PATCH /products/:id/restore`, protegidos, con `ParseUUIDPipe`
- [ ] 4.2 `GET /products/:id/history`, protegido, paginado
- [ ] 4.3 Las tres rutas documentadas en `docs/products.api-docs.ts` como decoradores compuestos, siguiendo la convención del módulo
- [ ] 4.4 Comprobar el orden de rutas: `:id/history` y `:id/discontinue` no pueden quedar capturadas por `:id`

## 5. Import CSV

- [ ] 5.1 `isIdentical` considera el estado: un producto retirado nunca cuenta como `unchanged`
- [ ] 5.2 `applyDtoToEntity` limpia `discontinuedAt` al actualizar, de modo que reimportar un SKU retirado lo reactive
- [ ] 5.3 La fila reactivada se reporta como `updated`, con un mensaje que nombre la reactivación

## 6. Tests de backend

- [ ] 6.1 `products.service.spec`: filtro de estado en `findAll`, `findOne` de un retirado lanza 404, `findCategories` no cuenta retirados
- [ ] 6.2 `products.service.spec`: `discontinue` y `restore` son idempotentes y no pierden la fecha original
- [ ] 6.3 `products.cache.spec`: retirar y restaurar invalidan el prefijo de la caché
- [ ] 6.4 `import.service.spec`: reimportar un SKU retirado lo reactiva y lo reporta como `updated`, no `unchanged`
- [ ] 6.5 Nuevo `product-history.spec` **contra Postgres real**: el trigger registra alta, cambio y borrado; un `UPDATE` por SQL directo también queda registrado; un `UPDATE` que no cambia nada no escribe entrada
- [ ] 6.6 `product-history.spec`: el historial sobrevive al borrado del producto, con la entrada del borrado como la más reciente
- [ ] 6.7 `orders.concurrency.spec`: el caso existente de borrado con 409 sigue pasando sin tocarlo, y se añade que retirar el mismo producto **sí** funciona
- [ ] 6.8 `route-protection.spec`: las tres rutas nuevas quedan clasificadas como protegidas

## 7. Frontend — contratos y datos

- [ ] 7.1 `types/product.ts`: `discontinuedAt` en `IProductItem`, y los tipos del historial
- [ ] 7.2 `actions/product.ts`: `discontinueProduct`, `restoreProduct`, `getProductHistory`, con sus mappers
- [ ] 7.3 `lib/axios.ts`: los tres endpoints nuevos
- [ ] 7.4 Hooks de React Query junto a los existentes, con `invalidateQueries` sobre la lista tras retirar o restaurar

## 8. Frontend — pantallas

- [ ] 8.1 Filtro de estado en la toolbar del listado, como chip reversible, con "a la venta" por defecto
- [ ] 8.2 Distinguir visualmente un producto retirado en la tabla, y que no se confunda con agotado
- [ ] 8.3 Acciones de fila: retirar / restaurar, y borrar marcado como permanente
- [ ] 8.4 Cuando el borrado falle con 409, explicar que tiene ventas y ofrecer retirarlo
- [ ] 8.5 Línea de tiempo del historial en el detalle del producto, con "de → a" en los cambios de valor
- [ ] 8.6 Estado vacío explícito para un producto sin historial registrado

## 9. Tests de frontend

- [ ] 9.1 Unitarios de los mappers del historial y del parámetro de estado en la URL
- [ ] 9.2 e2e: retirar un producto vendido lo saca de la tienda y lo deja restaurable
- [ ] 9.3 e2e: un producto retirado con el carrito abierto bloquea el checkout como uno borrado
- [ ] 9.4 e2e: el detalle muestra el historial tras editar el precio

## 10. Documentación y cierre

- [ ] 10.1 `docs/processes/P-02-product-crud.md`: el ciclo de vida y por qué borrar y retirar son distintos
- [ ] 10.2 Nuevo proceso o sección para el historial, con el argumento del trigger
- [ ] 10.3 `docs/testing/MATRIX.md`: casos nuevos y el resumen de cobertura recalculado
- [ ] 10.4 README: entrada en "Alternatives considered" (borrado duro vs retirar) y en las decisiones clave
- [ ] 10.5 `docs/backlog.md`: TK-058 cerrado con enlace al change archivado
- [ ] 10.6 Verificar en verde: `tsc`, `eslint`, las cuatro suites y un arranque limpio de Docker
