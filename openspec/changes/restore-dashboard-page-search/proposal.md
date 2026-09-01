## Why

TK-052. El usuario pide de forma explícita volver a tener el buscador de páginas del dashboard
(⌘K) funcionando. El componente existió al inicio del proyecto y hoy no está: **TK-027** lo
eliminó junto con el resto del chrome de plantilla (workspace switcher, notificaciones,
contactos, selector de idioma) y **TK-036** descartó revivirlo con este argumento textual:
*"Se descarta revivir la búsqueda global ⌘K que quitó TK-027 (corría sobre mocks; hacerla de
verdad es búsqueda cross-entity, otro ticket)"*.

Ese argumento sigue siendo correcto **para la búsqueda de contenido** y este change no lo
contradice: buscar productos u órdenes desde el header sigue fuera de alcance. Lo que se
restaura es la búsqueda de **páginas**, y ahí la premisa de TK-036 no aplica: los items del nav
(`config-nav-dashboard.tsx`) son datos reales de la aplicación, no mocks, y ya se le pasan al
header. Es decir, el componente que se elimina por "correr sobre mocks" es el único de aquella
purga que **no** corría sobre mocks.

Se documenta como reversión consciente de TK-027/TK-036, no como olvido.

## What Changes

- Se recupera `web/src/layouts/components/searchbar/` (`index.tsx`, `result-item.tsx`,
  `utils.ts`) desde `e66765e^` y se re-cablea en el header del dashboard, en el slot
  `rightAreaStart` que `header-base.tsx` ya expone.
- La fuente de datos deja de ser el nav de la plantilla y pasa a ser el `navData` vigente que
  `dashboard/layout.tsx` ya resuelve (Product, Orders, Status y sus hijos). Sin endpoint nuevo,
  sin backend.
- El atajo ⌘K (macOS) / Ctrl+K (Windows y Linux) abre el diálogo; `Esc` lo cierra; elegir un
  resultado navega a esa página.
- **Dos dependencias del componente original ya no existen** y no se resucitan:
  - el paquete npm `autosuggest-highlight` (+ `@types/autosuggest-highlight`), que resaltaba la
    coincidencia. Se reimplementa como helper local puro (`highlightMatches`) con tests unitarios.
  - el hook `src/hooks/use-event-listener.ts`. El atajo de teclado se registra con un `useEffect`
    propio dentro del componente.

  Ambas se eliminaron en la limpieza de archivos muertos por no tener consumidor. Volver a
  instalarlas una hora después sería revertir esa limpieza en vez de completarla; el coste de
  no hacerlo son ~20 líneas de helper propio, cubiertas por tests.
- No hay cambios de contrato con el API, ni de base de datos, ni de permisos.

## Capabilities

### New Capabilities

- `dashboard-page-search`: la búsqueda de páginas del dashboard — qué se puede encontrar, cómo se
  abre, cómo se ordena y qué pasa cuando no hay coincidencias.

### Modified Capabilities

Ninguna. `product-admin-listing`, `order-search` e `import-batch-search` cubren la búsqueda de
**contenido** dentro de cada tabla y no cambian: este change no toca ningún filtro existente ni
compite con ellos.

## Impact

**Código afectado** (todo en `web/`, ninguno en `api/`):

| Archivo | Cambio |
|---|---|
| `src/layouts/components/searchbar/index.tsx` | recuperado y adaptado (sin `autosuggest-highlight`, sin `useEventListener`) |
| `src/layouts/components/searchbar/result-item.tsx` | recuperado tal cual |
| `src/layouts/components/searchbar/utils.ts` | recuperado + `highlightMatches` local |
| `src/layouts/components/searchbar/utils.test.ts` | nuevo — tests del filtrado, el agrupado y el resaltado |
| `src/layouts/core/header-base.tsx` | nuevo slot opcional para el buscador |
| `src/layouts/dashboard/layout.tsx` | pasa el `navData` real al buscador |
| `web/e2e/` | caso e2e del atajo, el filtrado y la navegación |

**Dependencias**: ninguna nueva. Se apoya en `nav-section`, `iconify`, `label`, `scrollbar` y
`search-not-found`, todos vivos hoy.

**Riesgo**: bajo y acotado al chrome del dashboard. El buscador es aditivo — si falla, ninguna
pantalla existente deja de funcionar. El único punto de atención es no reintroducir el atajo
sobre inputs de texto (escribir "k" con ⌘ en un campo no debe abrir el diálogo).

**Documentación**: `docs/backlog.md` (TK-052 y la nota de reversión en TK-027/TK-036) y un caso
nuevo en `docs/testing/MATRIX.md`.
