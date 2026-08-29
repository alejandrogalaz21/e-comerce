## 1. La tienda como portada (TK-035)

- [ ] 1.1 Convertir `/` en la tienda y redirigir `/product` a `/`
- [ ] 1.2 Reutilizar el parser de estado de URL del dashboard para búsqueda, categoría y página
- [ ] 1.3 Añadir buscador a la tienda, resuelto en servidor
- [ ] 1.4 Añadir chips de categoría alimentados por `GET /products/categories`
- [ ] 1.5 Añadir paginación de servidor en lugar del `limit: 24` fijo
- [ ] 1.6 Crear el componente de icono por categoría, con normalización y reserva obligatoria
- [ ] 1.7 Sustituir el `placeholder.svg` de las tarjetas por ese icono
- [ ] 1.8 Hacer condicional el acceso de la cabecera según haya sesión

## 2. El carrito en la cabecera (TK-037)

- [ ] 2.1 Sacar `CartIcon` de la vista de la tienda y montarlo como slot del header
- [ ] 2.2 Convertirlo en botón con badge que abre un drawer de mini-carrito
- [ ] 2.3 Mostrar líneas, cantidades y total en el drawer, con paso al checkout
- [ ] 2.4 Dar estado vacío propio al mini-carrito
- [ ] 2.5 Mover el icono de envío dentro de `DELIVERY_OPTIONS`, en vez de comparar `label === 'Free'`

## 3. Recibo en PDF (TK-037)

- [ ] 3.1 Crear el generador con firma `downloadReceipt(order)`, alimentado por la orden real
- [ ] 3.2 Cargar `@react-pdf/renderer` con `import()` dinámico
- [ ] 3.3 Conectar `onDownloadPDF`, que hoy es un no-op
- [ ] 3.4 Verificar que el recibo coincide con la orden almacenada

## 4. Limpieza de la pantalla de acceso (TK-034)

- [ ] 4.1 Sacar el registro del router redirigiendo al acceso, conservando vista y ruta declarada
- [ ] 4.2 Quitar el enlace de registro del sign-in
- [ ] 4.3 Quitar el enlace «Need help?» del header de auth
- [ ] 4.4 Pasar el sign-in a `AuthCenteredLayout`
- [ ] 4.5 Añadir enlace de vuelta a la tienda

## 5. Tests

- [ ] 5.1 El mapa de iconos normaliza y devuelve reserva para lo desconocido
- [ ] 5.2 El estado de la tienda sobrevive a la URL
- [ ] 5.3 e2e: la portada es la tienda y `/product` redirige
- [ ] 5.4 e2e: buscar, filtrar por categoría y paginar
- [ ] 5.5 e2e: el carrito sigue visible en la ficha de producto y el mini-carrito abre
- [ ] 5.6 e2e: la cabecera ofrece acceder sin sesión
- [ ] 5.7 e2e: la dirección de registro lleva al acceso

## 6. Verificación

- [ ] 6.1 Lint, typecheck y tests del paquete `web/`
- [ ] 6.2 Suite de Playwright completa contra el stack
