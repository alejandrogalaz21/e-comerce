import type { Mock } from 'vitest';

import { vi, expect, describe, beforeEach, it } from 'vitest';

import axiosInstance from 'src/lib/axios';

import { getProducts } from './product';

vi.mock('src/lib/axios', async () => {
  const actual = await vi.importActual<typeof import('src/lib/axios')>('src/lib/axios');

  return {
    ...actual,
    default: { get: vi.fn() },
  };
});

const get = axiosInstance.get as unknown as Mock;

const EMPTY = {
  data: { data: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } },
};

async function paramsSentFor(params: Parameters<typeof getProducts>[0]) {
  get.mockResolvedValue(EMPTY);
  await getProducts(params);

  return get.mock.calls[0][1].params;
}

describe('getProducts builds the query the API expects', () => {
  beforeEach(() => {
    get.mockReset();
  });

  it('sends the catalog status when the caller asks for one', async () => {
    const sent = await paramsSentFor({ page: 1, limit: 20, status: 'discontinued' });

    expect(sent.status).toBe('discontinued');
  });

  it('omits the catalog status when the caller leaves it out', async () => {
    const sent = await paramsSentFor({ page: 1, limit: 20 });

    expect(sent).not.toHaveProperty('status');
  });

  it('carries every filter the list view can set', async () => {
    const sent = await paramsSentFor({
      page: 2,
      limit: 50,
      q: ['UI-001'],
      category: ['Home', 'Office'],
      minPrice: 10,
      maxPrice: 90,
      inStock: true,
      status: 'all',
      sortBy: 'price',
      sortDir: 'asc',
    });

    expect(sent).toEqual({
      page: 2,
      limit: 50,
      q: ['UI-001'],
      category: 'Home,Office',
      minPrice: 10,
      maxPrice: 90,
      inStock: true,
      status: 'all',
      sortBy: 'price',
      sortDir: 'asc',
    });
  });
});
