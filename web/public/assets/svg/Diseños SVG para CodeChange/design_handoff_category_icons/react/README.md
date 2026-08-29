# Íconos de categoría (Neon Glass) — componentes React

Set final elegido: **Neon Glass** — tile oscuro con glow del color de la categoría.

## Archivo

`CategoryIcons.jsx` — un solo archivo, sin dependencias (solo React ≥18 por `useId`). Copiar a tu carpeta de componentes, p.ej. `src/components/icons/CategoryIcons.jsx`.

> Si usás React 17 o menor, reemplazá `useId()` por cualquier generador de id estable (los ids solo se usan para el `<filter>` del glow y deben ser únicos por instancia).

## Uso

```jsx
import { CategoryIcon, Logo, LogoLockup } from './components/icons/CategoryIcons';

// En la card de producto, en lugar de la foto placeholder:
<CategoryIcon category={product.category} size={72} />

// Header del sitio:
<LogoLockup size={40} />
```

`CategoryIcon` normaliza el valor (`"Home & Office"` → `home_office`) y si no matchea ninguna categoría conocida cae automáticamente al ícono `unknown` — no hace falta manejarlo del lado del consumidor.

## Exports

| Export | Qué es |
|---|---|
| `CategoryIcon` | Ícono por categoría, con fallback automático. Props: `category`, `size` (default 64), `title`, y cualquier prop de `<svg>` |
| `Logo` | Marca sola (bolsa + chevrons de código + chispa) |
| `LogoLockup` | Logo + wordmark "CodeChange" para el header |
| `categoryKey(value)` | Normalizador; devuelve la key del ícono o `'unknown'` |
| `CATEGORY_COLORS` | Mapa key → color hex |
| `CATEGORY_KEYS` | Array de keys conocidas (sin `unknown`) |

## Categorías cubiertas

`footwear`, `food_beverage`, `electronics`, `accessories`, `outdoors`, `sports`, `home_office`, `clothing`, `kitchen`, `books`, `beauty`, `stationery`, `games`, `misc`, `gifts`, `pets`, `health`, `tools` + `unknown` (fallback).

## Notas

- Todo es SVG inline, escalable, sin assets externos ni fuentes.
- El color viene de `CATEGORY_COLORS`; para recolorear a la paleta de marca, editar ese mapa — el resto (glow, borde, relleno) deriva del mismo color.
- El tile asume fondo oscuro (`TILE_BG = #0d1420`). Sobre fondos claros conviene usar el set plano en `../icons/*.svg` o subir la opacidad del borde.
- Accesibilidad: sin `title` el svg queda `aria-hidden` (decorativo). Pasá `title="Electrónica"` cuando el ícono sea el único portador de significado.
