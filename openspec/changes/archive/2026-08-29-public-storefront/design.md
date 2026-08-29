## Context

Los tres tickets tocan los mismos archivos —header, rutas públicas, carrito— así que separarlos
solo produciría conflictos. El estado de partida:

```
  /            -> Navigate to /product
  /product     -> ProductShopView   { page: 1, limit: 24 }  fijo
                    - sin buscador, sin categorias, sin paginacion
                    - placeholder.svg repetido en las 24 tarjetas
                    - CartIcon: pildora position:fixed, solo aqui
  header       -> "Dashboard" siempre, con o sin sesion
  /auth/sign-in-> AuthSplitLayout + enlace a registro + "Need help?"
```

## Goals / Non-Goals

**Goals:** que la portada sea la tienda y se pueda usar; que el carrito no desaparezca; que la
cabecera no ofrezca lo que va a rechazar; que el recibo exista.

**Non-Goals:** el flujo de compra (P-04, ya cubierto), cuentas de cliente, traducciones.

## Decisions

### El estado de la tienda vive en la URL, reutilizando lo que ya existe

El dashboard ya resuelve esto en `product-list-params.ts`: parsea y serializa el estado completo,
omitiendo los valores por defecto. La tienda usa **la misma pieza** en lugar de una segunda
implementación que se desincronizaría.

La tienda expone menos dimensiones que el dashboard —búsqueda, categoría y página; ni precio ni
orden— porque son las que un comprador usa. Es un subconjunto, no un contrato distinto.

### El icono de categoría es un mapa con reserva obligatoria

`category` es `varchar(100)` libre con default `Uncategorized`, así que **cualquier** valor puede
llegar. El mapa normaliza (trim + minúsculas) y devuelve un icono de reserva cuando no reconoce el
valor.

La alternativa —derivar un icono del texto, por ejemplo por hash— daría algo distinto a cada
categoría pero sin relación con su significado, que es peor que un icono neutro honesto.

### El carrito sube al header como slot, no como página

`HeaderBase` ya expone `rightAreaStart` / `rightAreaEnd`, y `CheckoutProvider` ya vive en
`app.tsx`, así que el header puede leer el carrito sin mover el provider. El mini-carrito sigue el
patrón del `SettingsButton`: botón que abre un `Drawer`.

Se descartó llevar al usuario al checkout de un clic: ver qué llevas no debería obligar a salir de
donde estás.

### El PDF se carga bajo demanda

`@react-pdf/renderer` pesa demasiado para el bundle principal cuando solo se usa en una pantalla
que la mayoría no abre. Se carga con `import()` dinámico dentro del manejador.

La firma es `downloadReceipt(order)`: recibe la orden real que devolvió el API, no el estado del
contexto, de modo que el recibo no pueda discrepar de lo que se cobró.

### El registro se oculta, no se borra

Sale del router y del enlace del sign-in; la vista, la ruta declarada y el endpoint del API se
conservan. El proyecto opera con un usuario sembrado y ofrecer registro invita a un camino que no
lleva a ninguna parte útil, pero borrar el código sería tirar un punto de extensión que el backend
sigue soportando.

## Risks / Trade-offs

- **La tienda y el dashboard comparten el parser de la URL** → Si el dashboard añade una dimensión,
  la tienda la ignora sin romperse: lee solo las que usa.
- **Un catálogo con muchas categorías llena la fila de chips** → Se muestran las más frecuentes y el
  resto queda accesible por búsqueda; `GET /products/categories` ya devuelve el conteo.
- **El icono de reserva puede acabar siendo el más visto** → Es el comportamiento correcto para
  texto libre; el mapa cubre las categorías reales del CSV de ejemplo.
- **Ocultar el registro deja código sin ruta** → Declarado, no accidental: la vista se conserva a
  propósito y el ticket lo pide así.
