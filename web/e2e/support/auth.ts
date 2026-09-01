import { request } from '@playwright/test';

import type { APIRequestContext } from '@playwright/test';

export const API_URL = process.env.E2E_API_URL ?? 'http://localhost:4000';

export const DEMO_CREDENTIALS = { email: 'demo@demo.com', password: 'demo' };

export const STORAGE_STATE = 'e2e/.auth/demo-user.json';

export const ANONYMOUS_STATE = { cookies: [], origins: [] };

export async function fetchAccessToken(): Promise<string> {
  const api = await request.newContext({ baseURL: API_URL });

  try {
    const res = await api.post('/api/v1/auth/sign-in', { data: DEMO_CREDENTIALS });

    if (!res.ok()) {
      throw new Error(`Demo sign-in failed with status ${res.status()}`);
    }

    const body = (await res.json()) as { accessToken?: string };

    if (!body.accessToken) {
      throw new Error('Demo sign-in response did not include an access token');
    }

    return body.accessToken;
  } finally {
    await api.dispose();
  }
}

export async function createAuthenticatedApiContext(): Promise<APIRequestContext> {
  const accessToken = await fetchAccessToken();

  return request.newContext({
    baseURL: API_URL,
    extraHTTPHeaders: { Authorization: `Bearer ${accessToken}` },
  });
}

const DELETE_BATCH_SIZE = 10;

export async function deleteProducts(
  api: APIRequestContext,
  ids: readonly string[]
): Promise<string[]> {
  const refused: string[] = [];

  for (let start = 0; start < ids.length; start += DELETE_BATCH_SIZE) {
    const batch = ids.slice(start, start + DELETE_BATCH_SIZE);

    // eslint-disable-next-line no-await-in-loop
    const results = await Promise.all(
      batch.map(async (id) => ({ id, res: await api.delete(`/api/v1/products/${id}`) }))
    );

    results.forEach(({ id, res }) => {
      if (res.status() === 409) refused.push(id);
    });
  }

  return refused;
}

export async function deleteAllProducts(api: APIRequestContext): Promise<string[]> {
  const undeletable = new Set<string>();

  for (let guard = 0; guard < 50; guard += 1) {
    // eslint-disable-next-line no-await-in-loop
    const res = await api.get('/api/v1/products', { params: { page: 1, limit: 100 } });

    if (!res.ok()) {
      throw new Error(`Product listing failed with status ${res.status()}`);
    }

    // eslint-disable-next-line no-await-in-loop
    const body = (await res.json()) as { data: Array<{ id: string }> };
    const pending = body.data.map((item) => item.id).filter((id) => !undeletable.has(id));

    if (!pending.length) {
      return [...undeletable];
    }

    // eslint-disable-next-line no-await-in-loop
    const refused = await deleteProducts(api, pending);
    refused.forEach((id) => undeletable.add(id));
  }

  return [...undeletable];
}
