import { test, expect } from '@playwright/test';

import type { Page } from '@playwright/test';

/**
 * The searchbar is chrome, not a data surface: it reads the dashboard nav, so no
 * fixture products are needed. The suite starts authenticated (see support/auth.ts).
 */

const SHORTCUT = 'Control+k';

const dialog = (page: Page) => page.getByRole('dialog');

const searchInput = (page: Page) => dialog(page).getByPlaceholder('Search...');

test.describe('dashboard page search', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/product');
    await expect(page.getByRole('button', { name: /Search pages/ })).toBeVisible();
  });

  test('the keyboard shortcut opens the search', async ({ page }) => {
    await page.keyboard.press(SHORTCUT);

    await expect(dialog(page)).toBeVisible();
    await expect(searchInput(page)).toBeFocused();
  });

  test('the header control opens the same search', async ({ page }) => {
    await page.getByRole('button', { name: /Search pages/ }).click();

    await expect(dialog(page)).toBeVisible();
  });

  test('typing narrows the results to matching pages', async ({ page }) => {
    await page.keyboard.press(SHORTCUT);
    await searchInput(page).fill('import');

    await expect(dialog(page).getByText('Import CSV')).toBeVisible();
    await expect(dialog(page).getByText('Placed orders')).toHaveCount(0);
  });

  test('a page is findable by its path, not only its title', async ({ page }) => {
    await page.keyboard.press(SHORTCUT);
    await searchInput(page).fill('dashboard/status');

    await expect(dialog(page).getByText('Status').first()).toBeVisible();
  });

  test('the matching fragment is highlighted inside the result', async ({ page }) => {
    await page.keyboard.press(SHORTCUT);
    await searchInput(page).fill('stat');

    const highlighted = dialog(page).locator('[data-highlight="true"]').first();

    await expect(highlighted).toBeVisible();
    await expect(highlighted).toHaveText(/^stat$/i);
  });

  test('a query with no matches says so instead of showing an empty list', async ({ page }) => {
    await page.keyboard.press(SHORTCUT);
    await searchInput(page).fill('there-is-no-such-page');

    await expect(dialog(page).getByText(/No results found/i)).toBeVisible();
  });

  test('choosing a result navigates there and closes the dialog', async ({ page }) => {
    await page.keyboard.press(SHORTCUT);
    await searchInput(page).fill('import csv');
    await dialog(page).getByText('Import CSV').first().click();

    await expect(page).toHaveURL(/\/dashboard\/product\/import$/);
    await expect(dialog(page)).toHaveCount(0);
  });

  test('escape closes the search without navigating', async ({ page }) => {
    await page.keyboard.press(SHORTCUT);
    await expect(dialog(page)).toBeVisible();

    await page.keyboard.press('Escape');

    await expect(dialog(page)).toHaveCount(0);
    await expect(page).toHaveURL(/\/dashboard\/product$/);
  });

  test('the search does not remember the previous query', async ({ page }) => {
    await page.keyboard.press(SHORTCUT);
    await searchInput(page).fill('import');
    await page.keyboard.press('Escape');

    await page.keyboard.press(SHORTCUT);

    await expect(searchInput(page)).toHaveValue('');
  });

  test('the shortcut does not hijack typing in a page field', async ({ page }) => {
    const filter = page.getByPlaceholder('Search and press Enter...');
    await filter.click();
    await filter.fill('k');

    await expect(dialog(page)).toHaveCount(0);
    await expect(filter).toHaveValue('k');
  });

  test('the public storefront does not show the page search', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('button', { name: /Search pages/ })).toHaveCount(0);
  });
});
