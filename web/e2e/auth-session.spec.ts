import { test, expect, request } from '@playwright/test';

import {
  API_URL,
  ANONYMOUS_STATE,
  DEMO_CREDENTIALS,
  createAuthenticatedApiContext,
} from './support/auth';

const runId = Date.now();
const publicSku = `AUTH-${runId}`;
const publicProductName = `Auth Public Product ${runId}`;

let publicProductId: string;

test.describe.configure({ mode: 'serial' });

test.beforeAll(async () => {
  const api = await createAuthenticatedApiContext();

  const res = await api.post('/api/v1/products', {
    data: {
      name: publicProductName,
      sku: publicSku,
      description: 'Created by the auth session e2e spec',
      category: 'E2E',
      price: 19.99,
      stock: 7,
      weightKg: 1,
    },
  });
  expect(res.status()).toBe(201);

  const body = (await res.json()) as { id: string };
  publicProductId = body.id;

  await api.dispose();
});

test.afterAll(async () => {
  const api = await createAuthenticatedApiContext();
  await api.delete(`/api/v1/products/${publicProductId}`);
  await api.dispose();
});

test.describe('dashboard without a session', () => {
  test.use({ storageState: ANONYMOUS_STATE });

  test('redirects to sign-in instead of rendering the protected screen', async ({ page }) => {
    await page.goto('/dashboard/product');

    await expect(page).toHaveURL(/\/auth\/jwt\/sign-in\?returnTo=/);
    await expect(page.getByRole('heading', { name: 'Sign in to your account' })).toBeVisible();
    await expect(page.getByRole('grid')).toHaveCount(0);
  });

  test('lands on the originally requested route after signing in', async ({ page }) => {
    await page.goto('/dashboard/product/import');

    await expect(page).toHaveURL(
      `/auth/jwt/sign-in?returnTo=${encodeURIComponent('/dashboard/product/import')}`
    );

    await page.locator('input[name="email"]').fill(DEMO_CREDENTIALS.email);
    await page.locator('input[name="password"]').fill(DEMO_CREDENTIALS.password);
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page).toHaveURL(/\/dashboard\/product\/import$/);
    await expect(page.getByRole('heading', { name: 'Import CSV' })).toBeVisible();
  });

  test('wrong credentials show an inline error and stay on the sign-in screen', async ({
    page,
  }) => {
    await page.goto('/auth/jwt/sign-in');

    await page.locator('input[name="email"]').fill(DEMO_CREDENTIALS.email);
    await page.locator('input[name="password"]').fill('definitely-not-the-password');
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page.locator('.MuiAlert-standardError')).toBeVisible();
    await expect(page).toHaveURL(/\/auth\/jwt\/sign-in$/);

    // No redirect loop: the screen is still usable a moment later.
    await page.waitForTimeout(1_000);
    await expect(page).toHaveURL(/\/auth\/jwt\/sign-in$/);
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
  });

  test('session survives a reload and logout returns to the unauthenticated state', async ({
    page,
  }) => {
    await page.goto('/auth/jwt/sign-in');
    await page.locator('input[name="email"]').fill(DEMO_CREDENTIALS.email);
    await page.locator('input[name="password"]').fill(DEMO_CREDENTIALS.password);
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page).toHaveURL(/\/dashboard/);

    await page.goto('/dashboard/product');
    await expect(page.getByRole('grid')).toBeVisible();

    await page.reload();
    await expect(page).toHaveURL(/\/dashboard\/product$/);
    await expect(page.getByRole('grid')).toBeVisible();

    await page.getByRole('button', { name: 'account' }).click();
    await page.getByRole('menuitem', { name: 'Logout' }).click();

    await expect(page).toHaveURL(/\/auth\/jwt\/sign-in/);

    await page.goto('/dashboard/product');
    await expect(page).toHaveURL(/\/auth\/jwt\/sign-in\?returnTo=/);
    await expect(page.getByRole('grid')).toHaveCount(0);
  });
});

test.describe('public store without a session', () => {
  test.use({ storageState: ANONYMOUS_STATE });

  test('renders the catalog and the product detail without redirecting to login', async ({
    page,
  }) => {
    await page.goto('/product');

    await expect(page).toHaveURL(/\/product$/);
    await expect(page.getByRole('heading', { name: 'Shop' })).toBeVisible();
    await expect(page.getByRole('link', { name: publicProductName })).toBeVisible();

    await page.goto(`/product/${publicProductId}`);

    await expect(page).toHaveURL(new RegExp(`/product/${publicProductId}$`));
    await expect(page.getByRole('heading', { name: publicProductName })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Add to cart' })).toBeVisible();
  });

  test('GET /api/v1/products answers 200 without a token', async () => {
    const api = await request.newContext({ baseURL: API_URL });

    const list = await api.get('/api/v1/products', { params: { page: 1, limit: 10 } });
    expect(list.status()).toBe(200);

    const listBody = (await list.json()) as { data: Array<{ id: string }> };
    expect(Array.isArray(listBody.data)).toBeTruthy();

    const detail = await api.get(`/api/v1/products/${publicProductId}`);
    expect(detail.status()).toBe(200);

    await api.dispose();
  });
});

test.describe('dashboard with the stored session', () => {
  test('renders a protected route without redirecting', async ({ page }) => {
    await page.goto('/dashboard/product');

    await expect(page).toHaveURL(/\/dashboard\/product$/);
    await expect(page.getByRole('grid')).toBeVisible();
  });
});
