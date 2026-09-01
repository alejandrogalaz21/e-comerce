import { describe, it, expect } from 'vitest';

import { navData } from '../../config-nav-dashboard';
import { groupItems, applyFilter, getAllItems, highlightMatches } from './utils';

// ----------------------------------------------------------------------

const pages = () => getAllItems({ data: navData });

const titles = () => pages().map((item) => item.title);

describe('getAllItems', () => {
  it('walks the real dashboard nav instead of a fixed list', () => {
    expect(titles()).toEqual(
      expect.arrayContaining(['Product', 'Orders', 'Status', 'Import CSV', 'Placed orders'])
    );
  });

  it('reaches pages nested under a section', () => {
    const importCsv = pages().find((item) => item.title === 'Import CSV');

    expect(importCsv?.path).toBe('/dashboard/product/import');
  });

  it('groups a nested page under its parent section', () => {
    const create = pages().find((item) => item.title === 'Create');

    expect(create?.group).toBe('Product');
  });

  it('groups a top-level page under its subheader', () => {
    const status = pages().find((item) => item.title === 'Status');

    expect(status?.group).toBe('Management');
  });

  it('gives every page a group and a path', () => {
    pages().forEach((item) => {
      expect(item.group).toBeTruthy();
      expect(item.path).toBeTruthy();
    });
  });
});

describe('applyFilter', () => {
  const filter = (query: string) => applyFilter({ inputData: pages(), query }).map((i) => i.title);

  it('matches a partial title', () => {
    expect(filter('ord')).toContain('Orders');
  });

  it('matches a path', () => {
    expect(filter('dashboard/status')).toContain('Status');
  });

  it('ignores case', () => {
    expect(filter('PRODUCT')).toEqual(filter('product'));
  });

  it('returns everything when the query is empty', () => {
    expect(filter('')).toEqual(titles());
  });

  it('returns nothing when no page matches', () => {
    expect(filter('there-is-no-such-page')).toEqual([]);
  });
});

describe('groupItems', () => {
  it('collects pages under their group', () => {
    const groups = groupItems(pages());

    expect(Object.keys(groups)).toContain('Management');
    expect(groups.Product.map((item) => item.title)).toContain('Import CSV');
  });
});

describe('highlightMatches', () => {
  const flatten = (parts: { text: string }[]) => parts.map((part) => part.text).join('');

  it('leaves the text untouched when there is no query', () => {
    expect(highlightMatches('Product list', '')).toEqual([
      { text: 'Product list', highlight: false },
    ]);
  });

  it('splits a single match out of the text', () => {
    expect(highlightMatches('Product list', 'duct')).toEqual([
      { text: 'Pro', highlight: false },
      { text: 'duct', highlight: true },
      { text: ' list', highlight: false },
    ]);
  });

  it('highlights every occurrence, not only the first', () => {
    const parts = highlightMatches('order the orders', 'order');

    expect(parts.filter((part) => part.highlight)).toHaveLength(2);
  });

  it('matches regardless of case but keeps the original casing', () => {
    expect(highlightMatches('Import CSV', 'csv')).toEqual([
      { text: 'Import ', highlight: false },
      { text: 'CSV', highlight: true },
    ]);
  });

  it('leaves the text unchanged when nothing matches', () => {
    expect(highlightMatches('Status', 'zzz')).toEqual([{ text: 'Status', highlight: false }]);
  });

  it('reproduces the original text when the parts are joined back', () => {
    ['Product list', 'Import CSV', 'order the orders', ''].forEach((text) => {
      ['o', 'CSV', '', 'zzz'].forEach((query) => {
        expect(flatten(highlightMatches(text, query))).toBe(text);
      });
    });
  });
});
