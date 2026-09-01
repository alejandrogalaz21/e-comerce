# Tasks — Búsqueda de páginas del dashboard (TK-052)

## 1. Recuperar el componente

- [x] 1.1 Restaurar los tres archivos desde `e66765e^` a `web/src/layouts/components/searchbar/`:
      `git show e66765e^:web/src/layouts/components/searchbar/<archivo>`
- [x] 1.2 Verificar que `result-item.tsx` compila sin cambios (sus únicas dependencias son
      `varAlpha` y `Label`, ambas vivas)
- [x] 1.3 Confirmar que `utils.ts` solo depende de `nav-section` y de `flattenArray`
      (`src/utils/helper.ts`), ambos vivos

## 2. Quitar las dos dependencias muertas

- [x] 2.1 Escribir `highlightMatches(text, query)` en `utils.ts`, devolviendo
      `Array<{ text: string; highlight: boolean }>` — la misma forma que `parse()`, para que
      `result-item.tsx` no cambie
- [x] 2.2 Sustituir en `index.tsx` los dos `parse(x, match(x, query))` por `highlightMatches`
- [x] 2.3 Eliminar los imports de `autosuggest-highlight/parse` y `autosuggest-highlight/match`
- [x] 2.4 Reemplazar `useEventListener('keydown', ...)` por un `useEffect` local con su cleanup
- [x] 2.5 Corregir el atajo: `event.metaKey || event.ctrlKey` + `preventDefault()`, para que
      Ctrl+K funcione en Windows y Linux (el original solo miraba `metaKey`)
- [x] 2.6 Comprobar que no queda ninguna referencia a `autosuggest-highlight` ni a
      `use-event-listener`, y que ninguna de las dos vuelve a `package.json`

## 3. Cablear en el header

- [x] 3.1 Añadir la bandera `searchbar` a `slotsDisplay` en `layouts/core/header-base.tsx`,
      siguiendo el patrón de `settings` / `menuButton`
- [x] 3.2 Renderizar `<Searchbar />` en `rightAreaStart`, antes del botón de settings
- [x] 3.3 Pasar el `navData` ya resuelto desde `layouts/dashboard/layout.tsx`
- [x] 3.4 Comprobar los tres layouts de nav (vertical, mini, horizontal) y el móvil

## 4. Tests

- [x] 4.1 `searchbar/utils.test.ts`: `getAllItems` sobre el nav real del dashboard — encuentra las
      páginas anidadas y les asigna su grupo
- [x] 4.2 `applyFilter`: coincidencia por título, por ruta, parcial e insensible a mayúsculas, y
      sin resultados
- [x] 4.3 `groupItems`: agrupa por sección
- [x] 4.4 `highlightMatches`: query vacía, coincidencia única, coincidencia múltiple,
      insensibilidad a mayúsculas, y que concatenar los tramos reproduce el texto original
- [x] 4.5 e2e: Ctrl+K abre, escribir filtra, elegir navega, `Esc` cierra sin navegar, y escribir
      `k` dentro del filtro de la tabla no abre el diálogo

## 5. Verificación

- [x] 5.1 `npx tsc --noEmit` y `npm run lint` en `web/` sin avisos
- [x] 5.2 `npm run build` en `web/`
- [x] 5.3 `npm run test` en `web/` — los 152 existentes siguen verdes, más los nuevos
- [x] 5.4 `docker compose up -d --build` y `npx playwright test` — los 66 e2e existentes siguen
      verdes, más el nuevo
- [x] 5.5 Comprobar en la app que el buscador aparece en el header del dashboard y **no** en la
      tienda pública

## 6. Documentación

- [x] 6.1 Añadir el caso nuevo a `docs/testing/MATRIX.md`
- [x] 6.2 Anotar en TK-027 y TK-036 de `docs/backlog.md` que TK-052 revierte esa decisión, para
      que el historial no se contradiga en silencio
- [x] 6.3 Cerrar TK-052 y enlazar el change archivado al archivar
