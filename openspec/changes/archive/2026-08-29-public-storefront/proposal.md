## Why

Tickets **TK-034**, **TK-035** y **TK-037**. Los tres salen de usar la aplicación como lo haría un
comprador, y comparten los mismos archivos: el header, las rutas públicas y el carrito.

Hoy la puerta de entrada del proyecto es un redirect: `/` hace `<Navigate to="/product">`, y
`/product` pide `{ page: 1, limit: 24 }` fijo, sin buscador ni paginación. El evaluador aterriza en
una rejilla muda de 24 productos, con `placeholder.svg` repetido en todas las tarjetas.

Alrededor hay tres asperezas más:

- El **carrito desaparece** al entrar al detalle de un producto: `CartIcon` es una píldora fija
  montada solo dentro de `ProductShopView`.
- El header muestra **«Dashboard» siempre**, también sin sesión, y el guard rebota al pulsarlo.
- La pantalla de registro está accesible aunque el proyecto tiene un único usuario sembrado, y el
  sign-in arrastra el layout partido del template con su sidebar y su icono JWT.

## What Changes

### La tienda pasa a ser la portada (TK-035)

- `/` **es** la tienda: buscador, chips de categoría, rejilla y paginación servidor. `/product`
  redirige a `/`.
- **Filtros y página viven en la URL**, para que el botón atrás funcione y un enlace filtrado se
  pueda compartir.
- **Icono por categoría** en lugar del `placeholder.svg` repetido. `category` es texto libre con
  default `Uncategorized`, así que es un mapa normalizado (trim + minúsculas) con **fallback
  obligatorio**: una categoría desconocida no puede romper la tarjeta.
- El botón de sesión del header pasa a ser **condicional**: sin sesión «Sign in», con sesión el
  acceso al dashboard.

### El carrito acompaña al comprador (TK-037)

- `CartIcon` sale de la vista de la tienda y entra en el **header**, con badge, así que sigue
  visible en el detalle del producto.
- Pulsarlo abre un **mini-carrito** con las líneas, sus cantidades y el paso al checkout.
- El icono de envío deja de elegirse comparando `label === 'Free'` —un string de UI— y pasa a vivir
  dentro de la propia opción.
- **El recibo en PDF deja de ser un no-op.** `onDownloadPDF` no hace nada hoy;
  `@react-pdf/renderer` se carga con `import()` dinámico para que su peso no entre en el bundle
  principal, y el recibo se arma de la orden real que devolvió el API.

### La pantalla de acceso se limpia (TK-034)

- **El registro se oculta sin borrarse**: sale del router y del enlace del sign-in, pero la vista y
  la ruta declarada se conservan.
- Desaparece el enlace «Need help?».
- El sign-in pasa a `AuthCenteredLayout` —que ya existe en el repo sin usar— con lo que se van el
  sidebar y el icono JWT, y gana un enlace de vuelta a la tienda.

## Capabilities

### New Capabilities

- `public-storefront`: qué encuentra un visitante sin cuenta al entrar — cómo busca, filtra y
  pagina el catálogo, cómo se representa una categoría, y cómo el carrito le acompaña por el sitio.

### Modified Capabilities

- `auth-session`: la pantalla de acceso deja de ofrecer registro y gana una salida hacia la tienda.

## Impact

- `web/src/routes/sections/main.tsx` y `index.tsx` — `/` pasa a ser la tienda.
- `web/src/pages/product/list.tsx` y `sections/product/view/product-shop-view.tsx` — buscador,
  categorías, paginación.
- **Nuevo** componente de icono por categoría y **nuevo** mini-carrito.
- `web/src/layouts/main/layout.tsx` y `config-nav-main.tsx` — carrito y sesión en el header.
- `web/src/routes/sections/auth.tsx` y el layout del sign-in.
- `web/src/sections/checkout/checkout-view.tsx` y `checkout-delivery.tsx` — recibo y envío.

## Non-Goals

- Tocar el detalle de producto o el flujo de compra: son P-04 y ya están cubiertos.
- Cuentas de cliente. El registro se oculta, no se rediseña.
- Traducciones y modo oscuro: fuera de alcance.
