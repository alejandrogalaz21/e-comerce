## 1. La tienda como portada (TK-035)

- [x] 1.1 Convertir `/` en la tienda y redirigir `/product` a `/`
- [x] 1.2 Reutilizar el parser de estado de URL del dashboard para búsqueda, categoría y página
- [x] 1.3 Añadir buscador a la tienda, resuelto en servidor
- [x] 1.4 Añadir chips de categoría alimentados por `GET /products/categories`
- [x] 1.5 Añadir paginación de servidor en lugar del `limit: 24` fijo
- [x] 1.6 Crear el componente de icono por categoría, con normalización y reserva obligatoria
- [x] 1.7 Sustituir el `placeholder.svg` de las tarjetas por ese icono
- [x] 1.8 Hacer condicional el acceso de la cabecera según haya sesión

## 2. El carrito en la cabecera (TK-037)

- [x] 2.1 Sacar `CartIcon` de la vista de la tienda y montarlo como slot del header
- [x] 2.2 Convertirlo en botón con badge que abre un drawer de mini-carrito
- [x] 2.3 Mostrar líneas, cantidades y total en el drawer, con paso al checkout
- [x] 2.4 Dar estado vacío propio al mini-carrito
- [x] 2.5 Mover el icono de envío dentro de `DELIVERY_OPTIONS`, en vez de comparar `label === 'Free'`

## 3. Recibo en PDF (TK-037)

- [x] 3.1 Crear el generador con firma `downloadReceipt(order)`, alimentado por la orden real
- [x] 3.2 Cargar `@react-pdf/renderer` con `import()` dinámico
- [x] 3.3 Conectar `onDownloadPDF`, que hoy es un no-op
- [x] 3.4 Verificar que el recibo coincide con la orden almacenada

## 4. Limpieza de la pantalla de acceso (TK-034)

- [x] 4.1 Sacar el registro del router redirigiendo al acceso, conservando vista y ruta declarada
- [x] 4.2 Quitar el enlace de registro del sign-in
- [x] 4.3 Quitar el enlace «Need help?» del header de auth
- [x] 4.4 Pasar el sign-in a `AuthCenteredLayout`
- [x] 4.5 Añadir enlace de vuelta a la tienda

## 5. Tests

- [x] 5.1 El mapa de iconos normaliza y devuelve reserva para lo desconocido
- [x] 5.2 El estado de la tienda sobrevive a la URL
- [x] 5.3 e2e: la portada es la tienda y `/product` redirige
- [x] 5.4 e2e: buscar, filtrar por categoría y paginar
- [x] 5.5 e2e: el carrito sigue visible en la ficha de producto y el mini-carrito abre
- [x] 5.6 e2e: la cabecera ofrece acceder sin sesión
- [x] 5.7 e2e: la dirección de registro lleva al acceso

## 6. Verificación

- [x] 6.1 Lint, typecheck y tests del paquete `web/`
- [x] 6.2 Suite de Playwright completa contra el stack
