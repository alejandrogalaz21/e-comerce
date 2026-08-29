/**
 * CodeChange — Category icons (Neon Glass) + brand logo.
 *
 * Self-contained React SVG components. No deps, no external assets.
 *
 *   import { CategoryIcon, Logo, CATEGORY_KEYS } from './CategoryIcons';
 *
 *   <CategoryIcon category={product.category} size={72} />   // falls back to "unknown"
 *   <Logo size={40} />
 *
 * Each icon renders a 64x64 viewBox: dark glass tile + colored glow + line glyph.
 */

import React, { useId } from 'react';

/* ------------------------------------------------------------------ palette */

export const CATEGORY_COLORS = {
  footwear: '#fb923c',
  food_beverage: '#fbbf24',
  electronics: '#60a5fa',
  accessories: '#c084fc',
  outdoors: '#4ade80',
  sports: '#f87171',
  home_office: '#2dd4bf',
  clothing: '#f472b6',
  kitchen: '#fde047',
  books: '#a78bfa',
  beauty: '#f9a8d4',
  stationery: '#22d3ee',
  games: '#818cf8',
  misc: '#94a3b8',
  gifts: '#f87171',
  pets: '#fbbf24',
  health: '#fb7185',
  tools: '#a8a29e',
  unknown: '#cbd5e1',
};

export const TILE_BG = '#0d1420';

/* -------------------------------------------------------------------- glyphs
 * Drawn in a 48x48 box, translated to sit centered inside the 64x64 tile.
 * `s` = stroke props, `f` = accent fill props (both injected by the frame).
 */

const GLYPHS = {
  footwear: (s, f) => (
    <>
      <path {...s} d="M6 33h6c1.5 0 2.5-.6 3.8-1.7l6-5.1c1.6-1.4 3.4-2.2 5.6-2.2h9.6c3 0 5.4 1.9 6 4.8l.5 2.2" />
      <path {...s} {...f} d="M6 33v3c0 1.1.9 2 2 2h32c1.1 0 2-.9 2-2v-2H6z" />
      <path {...s} d="M18 26l2 5M25 24l2 5M32 24l1.6 5" />
    </>
  ),
  food_beverage: (s, f) => (
    <>
      <path {...s} {...f} d="M12 18h20l-2 18a3 3 0 01-3 3H17a3 3 0 01-3-3l-2-18z" />
      <path {...s} d="M32 21h2.5a4.5 4.5 0 010 9H31" />
      <path {...s} d="M13 24h18" />
      <path {...s} d="M18 9c0 2.5-2 2.5-2 5M24 8c0 2.5-2 2.5-2 5M30 9c0 2.5-2 2.5-2 5" />
    </>
  ),
  electronics: (s, f) => (
    <>
      <rect {...s} {...f} x="14" y="14" width="20" height="20" rx="3" />
      <rect {...s} x="20" y="20" width="8" height="8" rx="1.5" />
      <path {...s} d="M19 8v6M24 8v6M29 8v6M19 34v6M24 34v6M29 34v6M8 19h6M8 24h6M8 29h6M34 19h6M34 24h6M34 29h6" />
    </>
  ),
  accessories: (s, f) => (
    <>
      <circle {...s} {...f} cx="14" cy="27" r="6.5" />
      <circle {...s} {...f} cx="34" cy="27" r="6.5" />
      <path {...s} d="M20.5 26h7" />
      <path {...s} d="M8.5 24l2.5-7h4M39.5 24L37 17h-4" />
      <path {...s} d="M11 25.5a3.5 3.5 0 013.5-2.5" />
    </>
  ),
  outdoors: (s, f) => (
    <>
      <path {...s} {...f} d="M24 8L41 36H7z" />
      <path {...s} d="M24 8l-6.5 10.7 3.5 3 4-3.4 4 3.4 3.4-3z" />
      <circle {...s} cx="33" cy="13" r="3.2" />
      <path {...s} d="M7 36h34" />
    </>
  ),
  sports: (s, f) => (
    <>
      <path {...s} d="M14 24h20" />
      <rect {...s} {...f} x="5" y="17" width="6.5" height="14" rx="2.5" />
      <rect {...s} {...f} x="36.5" y="17" width="6.5" height="14" rx="2.5" />
      <rect {...s} x="11.5" y="19.5" width="4.5" height="9" rx="1.5" />
      <rect {...s} x="32" y="19.5" width="4.5" height="9" rx="1.5" />
    </>
  ),
  home_office: (s, f) => (
    <>
      <path {...s} d="M7 24L24 9l17 15" />
      <path {...s} {...f} d="M12.5 21v16a2 2 0 002 2h19a2 2 0 002-2V21" />
      <path {...s} d="M20 39v-9.5h8V39" />
      <path {...s} d="M31 12.5V9h4v7" />
    </>
  ),
  clothing: (s, f) => (
    <>
      <path {...s} {...f} d="M18 9l6 4.5L30 9l9 6.5-4.5 6.5L31 20v19H17V20l-3.5 2L9 15.5z" />
      <path {...s} d="M18 9c0 3.5 2.7 6 6 6s6-2.5 6-6" />
    </>
  ),
  kitchen: (s, f) => (
    <>
      <path {...s} {...f} d="M10 22h28v5.5A11 11 0 0127 38.5h-6A11 11 0 0110 27.5V22z" />
      <path {...s} d="M6 22h36" />
      <path {...s} d="M38 25h3a3.5 3.5 0 010 7h-3.6" />
      <path {...s} d="M21 19c0-4-4-5-2.5-9M28 19c0-4-4-5-2.5-9" />
    </>
  ),
  books: (s, f) => (
    <>
      <path {...s} {...f} d="M24 14c-3-2.2-8-3.2-14-3.2V35c6 0 11 1 14 3.2 3-2.2 8-3.2 14-3.2V10.8c-6 0-11 1-14 3.2z" />
      <path {...s} d="M24 14v24.2" />
      <path {...s} d="M15 19h4M15 24h4M29 19h4M29 24h4" />
    </>
  ),
  beauty: (s, f) => (
    <>
      <path {...s} {...f} d="M19.5 22h9v14.5a4.5 4.5 0 01-9 0V22z" />
      <path {...s} d="M19.5 22l2-13h5l2 13" />
      <path {...s} d="M19.5 27h9" />
      <path {...s} d="M35 13l1.4 3.6L40 18l-3.6 1.4L35 23l-1.4-3.6L30 18l3.6-1.4z" />
    </>
  ),
  stationery: (s, f) => (
    <>
      <path {...s} {...f} d="M12.5 34.5L10 41l6.5-2.5 19-19-4-4z" />
      <path {...s} d="M31.5 15.5l3.5-3.5a2.8 2.8 0 014 4l-3.5 3.5z" />
      <path {...s} d="M12.5 34.5l4 4" />
    </>
  ),
  games: (s, f) => (
    <>
      <path {...s} {...f} d="M17 17h14c5 0 9 3.5 10 9l1 6c.6 3.5-1.6 6-4.6 6-2 0-3.4-1-4.6-2.6L31 33H17l-1.8 2.4C14 37 12.6 38 10.6 38 7.6 38 5.4 35.5 6 32l1-6c1-5.5 5-9 10-9z" />
      <path {...s} d="M14 24v6M11 27h6" />
      <circle cx="32" cy="25" r="1.8" fill={s.stroke} />
      <circle cx="36.5" cy="29" r="1.8" fill={s.stroke} />
    </>
  ),
  misc: (s, f) => (
    <>
      <circle {...s} {...f} cx="14" cy="14" r="4.5" />
      <circle {...s} {...f} cx="34" cy="14" r="4.5" />
      <circle {...s} {...f} cx="14" cy="34" r="4.5" />
      <circle {...s} {...f} cx="34" cy="34" r="4.5" />
      <circle {...s} {...f} cx="24" cy="24" r="5.5" />
      <path {...s} d="M17.5 17.5l3 3M30.5 17.5l-3 3M17.5 30.5l3-3M30.5 30.5l-3-3" />
    </>
  ),
  gifts: (s, f) => (
    <>
      <rect {...s} {...f} x="8" y="19" width="32" height="21" rx="2.5" />
      <path {...s} d="M6.5 19h35v7h-35z" />
      <path {...s} d="M24 19v21" />
      <path {...s} d="M24 19c-1-6-5.5-9.5-8.5-6.5S18 19 24 19zM24 19c1-6 5.5-9.5 8.5-6.5S30 19 24 19z" />
    </>
  ),
  pets: (s, f) => (
    <>
      <path {...s} {...f} d="M24 23c5.5 0 10 4.6 10 9.4 0 3.5-2.6 5.6-6 5.6h-8c-3.4 0-6-2.1-6-5.6C14 27.6 18.5 23 24 23z" />
      <ellipse {...s} {...f} cx="11.5" cy="20" rx="4" ry="5" />
      <ellipse {...s} {...f} cx="20" cy="13.5" rx="4" ry="5" />
      <ellipse {...s} {...f} cx="28.5" cy="13.5" rx="4" ry="5" />
      <ellipse {...s} {...f} cx="36.5" cy="20" rx="4" ry="5" />
    </>
  ),
  health: (s, f) => (
    <>
      <path {...s} {...f} d="M24 39.5S9 30.5 9 20.5A8.5 8.5 0 0124 15a8.5 8.5 0 0115 5.5c0 10-15 19-15 19z" />
      <path {...s} d="M12 24.5h6l2.5-5.5 3.5 10 2.5-4.5h9" />
    </>
  ),
  tools: (s, f) => (
    <>
      <path {...s} {...f} d="M32.5 8a8.5 8.5 0 00-9.2 13.4L9.5 35.3l4.2 4.2 13.9-13.9A8.5 8.5 0 1032.5 8z" />
      <circle {...s} cx="33" cy="15" r="3" />
      <path {...s} d="M13 33.5l2 2" />
    </>
  ),
  unknown: (s, f) => (
    <>
      <path {...s} {...f} strokeDasharray="5 3.5" d="M24 8l15 8v16l-15 8-15-8V16z" />
      <path {...s} d="M20 20.5a4 4 0 117.6 1.8c-.7 1.4-2.4 2-3 3.2-.35.7-.6 1.4-.6 2.3" />
      <circle cx="24" cy="32" r="1.8" fill={s.stroke} />
    </>
  ),
};

export const CATEGORY_KEYS = Object.keys(GLYPHS).filter((k) => k !== 'unknown');

/* --------------------------------------------------------------------- frame */

/**
 * Neon-glass shell: dark rounded tile, blurred colored copy of the glyph
 * underneath, crisp glyph on top.
 */
function NeonIcon({ glyph, color, size = 64, title, className, style, ...rest }) {
  const uid = useId().replace(/:/g, '');
  const stroke = { fill: 'none', stroke: color, strokeWidth: 2.2, strokeLinecap: 'round', strokeLinejoin: 'round' };
  const glowStroke = { ...stroke, strokeWidth: 5 };
  const accentFill = { fill: color, fillOpacity: 0.18 };
  const noFill = { fill: 'none' };

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      width={size}
      height={size}
      fill="none"
      role={title ? 'img' : 'presentation'}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      className={className}
      style={style}
      {...rest}
    >
      {title ? <title>{title}</title> : null}
      <defs>
        <filter id={`glow-${uid}`} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="2.4" />
        </filter>
      </defs>
      <rect x="1" y="1" width="62" height="62" rx="17" fill={TILE_BG} stroke={color} strokeOpacity="0.35" strokeWidth="1.5" />
      <g transform="translate(8,8)" filter={`url(#glow-${uid})`} opacity="0.55">
        {glyph(glowStroke, noFill)}
      </g>
      <g transform="translate(8,8)">{glyph(stroke, accentFill)}</g>
    </svg>
  );
}

/* ---------------------------------------------------------------- public API */

/** Normalizes a raw CSV/API category value to an icon key. */
export function categoryKey(category) {
  if (!category) return 'unknown';
  const k = String(category).trim().toLowerCase().replace(/[\s&/-]+/g, '_').replace(/_+/g, '_');
  return GLYPHS[k] ? k : 'unknown';
}

/** Renders the icon for a product category; unknown values get the fallback. */
export function CategoryIcon({ category, size = 64, title, ...rest }) {
  const key = categoryKey(category);
  return <NeonIcon glyph={GLYPHS[key]} color={CATEGORY_COLORS[key]} size={size} title={title ?? key} {...rest} />;
}

/** Brand mark: shopping bag with code chevrons and a spark. */
export function Logo({ size = 48, color = '#34d399', title = 'CodeChange', ...rest }) {
  const glyph = (s, f) => (
    <>
      <path {...s} {...f} d="M11.5 18h25l2.2 17.8a4.2 4.2 0 01-4.2 4.7H13.5a4.2 4.2 0 01-4.2-4.7z" />
      <path {...s} d="M17.5 18v-4a6.5 6.5 0 0113 0v4" />
      <path {...s} d="M10.4 24.5h27.2" />
      <path {...s} d="M20.5 28.5L17 32l3.5 3.5" />
      <path {...s} d="M27.5 28.5L31 32l-3.5 3.5" />
      <path {...s} d="M25.6 27.6l-3.2 8.8" />
      <path {...s} {...f} d="M38 8l1.3 3.4L42.7 12.7 39.3 14 38 17.4 36.7 14 33.3 12.7 36.7 11.4z" />
    </>
  );
  return <NeonIcon glyph={glyph} color={color} size={size} title={title} {...rest} />;
}

/** Logo + wordmark, for the site header. */
export function LogoLockup({ size = 40, color = '#34d399', textColor = '#f1f5f9' }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: size * 0.3 }}>
      <Logo size={size} color={color} />
      <span style={{ fontSize: size * 0.5, fontWeight: 700, letterSpacing: '-0.02em', color: textColor }}>
        Code<span style={{ color }}>Change</span>
      </span>
    </span>
  );
}

export default CategoryIcon;
