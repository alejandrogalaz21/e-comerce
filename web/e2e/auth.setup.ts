import { test as setup, expect } from '@playwright/test';

import { STORAGE_STATE, DEMO_CREDENTIALS } from './support/auth';

setup('authenticate as the demo user', async ({ page }) => {
  await page.goto('/auth/jwt/sign-in');

  await page.locator('input[name="email"]').fill(DEMO_CREDENTIALS.email);
  await page.locator('input[name="password"]').fill(DEMO_CREDENTIALS.password);
  await page.getByRole('button', { name: 'Sign in' }).click();

  await page.waitForURL(/\/dashboard/);
  await expect(page.getByRole('button', { name: 'account' })).toBeVisible();

  await page.context().storageState({ path: STORAGE_STATE });
});
