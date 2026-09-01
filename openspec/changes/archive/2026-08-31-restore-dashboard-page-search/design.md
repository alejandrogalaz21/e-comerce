# Design — Búsqueda de páginas del dashboard (TK-052)

## Contexto

El componente ya existió: `web/src/layouts/components/searchbar/` (361 líneas en tres archivos),
borrado en `e66765e`. No se reescribe desde cero — se recupera de git y se adapta, porque el
código original ya resuelve bien las dos partes no triviales (aplanar un nav jerárquico a una
lista de páginas, y reconstruir el grupo al que pertenece cada una).

Lo que cambia respecto al original son tres cosas concretas, detalladas abajo.

## Decisión 1 — El resaltado, sin `autosuggest-highlight`

**Problema**: el original usaba `parse`/`match` de `autosuggest-highlight` para partir el texto en
tramos resaltados y no resaltados. Ese paquete se desinstaló al purgar dependencias sin
consumidor, junto con `@types/autosuggest-highlight`.

**Opciones**:

| Opción | Coste | Consecuencia |
|---|---|---|
| Reinstalar `autosuggest-highlight` + `@types` | 2 dependencias | Revierte parte de la limpieza recién hecha para una función de ~20 líneas |
| **Helper local `highlightMatches`** ← elegida | ~20 líneas + tests | Cero dependencias; el contrato queda cubierto por tests propios |
| Renderizar sin resaltado | 0 | Incumple el spec y degrada el componente |

**Contrato del helper** — se elige deliberadamente **idéntico** al de `parse()`, es decir
`Array<{ text: string; highlight: boolean }>`, para que `result-item.tsx` se recupere sin tocar
una sola línea: su tipo `Props` ya espera exactamente esa forma.

```
highlightMatches('Product list', 'duct')
  → [{ text: 'Pro', highlight: false },
     { text: 'duct', highlight: true },
     { text: ' list', highlight: false }]
```

Reglas: comparación insensible a mayúsculas; **el texto devuelto es el original**, no el
normalizado (concatenar los `text` debe reproducir la entrada exacta); query vacía devuelve un
único tramo sin resaltar; todas las apariciones se resaltan, no solo la primera.

## Decisión 2 — El atajo, sin `use-event-listener`

El hook `src/hooks/use-event-listener.ts` también se eliminó. El listener se registra con un
`useEffect` local sobre `document`, con su `removeEventListener` en el cleanup.

**Además se corrige un bug del original**: comprobaba `event.metaKey` únicamente, de modo que
**Ctrl+K nunca funcionó en Windows ni en Linux** — que es justamente donde se desarrolla y se
evalúa este proyecto. La condición pasa a `event.metaKey || event.ctrlKey`, y se añade
`preventDefault()` para que el navegador no se lleve el atajo.

Exigir el modificador es también lo que impide que el atajo secuestre la escritura: pulsar `k`
a secas dentro del filtro de la tabla de productos no abre nada, sin necesidad de inspeccionar
el elemento enfocado.

## Decisión 3 — La fuente de datos

El componente no construye su propia lista ni importa `config-nav-dashboard` directamente:
recibe `data` por props, igual que en el original. `dashboard/layout.tsx` ya resuelve

```ts
const navData = data?.nav ?? dashboardNavData;
```

y se lo pasa a `NavVertical`, `NavHorizontal` y `NavMobile`. El buscador se cuelga de esa misma
variable, en el slot `rightAreaStart` del header.

Es lo que hace verdadera la afirmación del spec *"la lista sigue al nav"*: no hay una segunda
lista de páginas que pueda desincronizarse. Si mañana se añade una sección al dashboard, el
buscador la encuentra sin tocar este componente. También es lo que separa este change de la
razón por la que TK-036 lo descartó: el dato es real, no un mock.

## Alcance del header

`header-base.tsx` ya expone `slots.rightAreaStart` y un `slotsDisplay` con banderas por control
(`helpLink`, `settings`, `menuButton`). Se añade la bandera `searchbar` siguiendo ese patrón, en
vez de inventar un mecanismo nuevo. Por defecto queda activa solo donde se le pasan datos.

## Qué NO entra

- **Búsqueda de contenido** (productos, órdenes, batches). Sigue siendo lo que TK-036 llamó
  búsqueda cross-entity y sigue fuera de alcance. Cada tabla conserva su propio filtro
  server-side, que es donde esa búsqueda está bien resuelta hoy.
- **Navegación por teclado dentro de la lista** (flechas + Enter). El spec exige elegir con el
  ratón; añadir un roving tabindex correcto es un trabajo aparte y el original tampoco lo tenía.
  Se deja anotado como deuda, no se finge.
- **Historial de búsquedas recientes**. Requeriría persistencia y no lo pidió nadie.

## Verificación

- Tests unitarios de `utils.ts`: aplanado del nav real, filtrado por título y por ruta,
  insensibilidad a mayúsculas, agrupado, y las cuatro reglas de `highlightMatches`.
- Caso e2e: abrir con Ctrl+K, escribir, ver el resultado resaltado, elegirlo y comprobar la URL.
- `tsc --noEmit`, `lint`, `build`, `vitest` y la suite e2e completa contra el stack de Docker.
