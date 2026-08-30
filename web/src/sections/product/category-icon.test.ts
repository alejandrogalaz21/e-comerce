import { describe, it, expect } from 'vitest';

import { categoryIcon, FALLBACK_CATEGORY_ICON } from './category-icon';

// ----------------------------------------------------------------------

describe('categoryIcon', () => {
  it('maps a known category to its own icon', () => {
    expect(categoryIcon('Electronics')).not.toBe(FALLBACK_CATEGORY_ICON);
  });

  it('falls back for a category it does not know', () => {
    expect(categoryIcon('Quantum Widgets')).toBe(FALLBACK_CATEGORY_ICON);
  });

  it('falls back for the default the API assigns to empty categories', () => {
    expect(categoryIcon('Uncategorized')).toBe(FALLBACK_CATEGORY_ICON);
  });

  it('ignores capitalisation and surrounding whitespace', () => {
    expect(categoryIcon('  eLeCtRoNiCs  ')).toBe(categoryIcon('Electronics'));
  });

  it('falls back rather than breaking when the category is missing', () => {
    expect(categoryIcon(null)).toBe(FALLBACK_CATEGORY_ICON);
    expect(categoryIcon(undefined)).toBe(FALLBACK_CATEGORY_ICON);
    expect(categoryIcon('')).toBe(FALLBACK_CATEGORY_ICON);
  });

  it('always returns something renderable', () => {
    ['Books', 'nonsense', '', '   ', 'Food & Beverage'].forEach((value) => {
      expect(categoryIcon(value)).toMatch(/^solar:/);
    });
  });
});
