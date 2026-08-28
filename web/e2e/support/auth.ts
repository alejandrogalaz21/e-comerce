import { request } from '@playwright/test';

import type { APIRequestContext } from '@playwright/test';

/**
 * Shared authentication helpers for the e2e suite.
 *
 * The browser session is provided by the `setup` project (see `e2e/auth.setup.ts`):
 * it signs in once through the UI and writes the storage state to STORAGE_STATE,
 * which `playwright.config.ts` feeds to the `chromium` project. Specs therefore start
 * already authenticated; a spec that needs an anonymous browser opts out with
 * `test.use({ storageState: ANONYMOUS_STATE })`.
 *
 * The API request contexts used for setup/cleanup are not covered by the browser
 * storage state, so they sign in over HTTP and carry an explicit bearer token.
 */

export const API_URL = 'http://localhost:4000';

export const DEMO_CREDENTIALS = { email: 'demo@demo.com', password: 'demo' };

/** Relative to the Playwright config directory; gitignored. */
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

/** API request context that carries the demo user's bearer token. */
export async function createAuthenticatedApiContext(): Promise<APIRequestContext> {
  const accessToken = await fetchAccessToken();

  return request.newContext({
    baseURL: API_URL,
    extraHTTPHeaders: { Authorization: `Bearer ${accessToken}` },
  });
}

/** Deletes in small batches: a single burst of ~100 concurrent DELETEs makes the API drop sockets. */
const DELETE_BATCH_SIZE = 10;

export async function deleteProducts(
  api: APIRequestContext,
  ids: readonly string[]
): Promise<void> {
  for (let start = 0; start < ids.length; start += DELETE_BATCH_SIZE) {
    const batch = ids.slice(start, start + DELETE_BATCH_SIZE);

    // eslint-disable-next-line no-await-in-loop
    await Promise.all(batch.map((id) => api.delete(`/api/v1/products/${id}`)));
  }
}

export async function deleteAllProducts(api: APIRequestContext): Promise<void> {
  for (let guard = 0; guard < 50; guard += 1) {
    // eslint-disable-next-line no-await-in-loop
    const res = await api.get('/api/v1/products', { params: { page: 1, limit: 100 } });

    if (!res.ok()) {
      throw new Error(`Product listing failed with status ${res.status()}`);
    }

    // eslint-disable-next-line no-await-in-loop
    const body = (await res.json()) as { data: Array<{ id: string }> };

    if (!body.data.length) {
      return;
    }

    // eslint-disable-next-line no-await-in-loop
    await deleteProducts(
      api,
      body.data.map((item) => item.id)
    );
  }
}
