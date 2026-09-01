import { test, expect } from '@playwright/test';

import { ANONYMOUS_STATE } from './support/auth';

const PRODUCT_LINK = 'a[href*="/product/"]:not([href*="checkout"])';

test.describe.configure({ mode: 'serial' });

test.use({ storageState: ANONYMOUS_STATE });

test.describe('storefront', () => {
  test('the root address is the shop, not a redirect to somewhere else', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { name: 'Shop' })).toBeVisible();
    await expect(page.locator(PRODUCT_LINK).first()).toBeVisible();
    await expect(page).toHaveURL(/\/$/);
  });

  test('the old shop address still lands on the shop', async ({ page }) => {
    await page.goto('/product');

    await expect(page.getByRole('heading', { name: 'Shop' })).toBeVisible();
    await expect(page).toHaveURL(/\/$/);
  });

  test('searching narrows the catalog and lives in the address', async ({ page }) => {
    await page.goto('/');

    const search = page.getByLabel('Search products');
    await search.fill('shoes');
    await search.press('Enter');

    await expect(page).toHaveURL(/q=shoes/);
    await expect(page.locator(PRODUCT_LINK).first()).toBeVisible();
  });

  test('a search with no matches says so instead of showing an empty grid', async ({ page }) => {
    await page.goto('/?q=zzzznotathing');

    await expect(page.getByText(/No results for/)).toBeVisible();
  });

  test('a category chip filters, and the address remembers it', async ({ page }) => {
    await page.goto('/');

    const chip = page
      .locator('.MuiChip-root')
      .filter({ hasText: /Electronics/ })
      .first();
    await expect(chip).toBeVisible();
    await chip.click();

    await expect(page).toHaveURL(/category=Electronics/);
  });

  test('the view survives a reload and the back button', async ({ page }) => {
    await page.goto('/');

    const search = page.getByLabel('Search products');
    await search.fill('tent');
    await search.press('Enter');
    await expect(page).toHaveURL(/q=tent/);

    await page.reload();
    await expect(page).toHaveURL(/q=tent/);
    await expect(search).toHaveValue('tent');

    await page.goBack();
    await expect(page).not.toHaveURL(/q=tent/);
  });

  test('the catalog is paginated rather than capped at a fixed number', async ({ page }) => {
    await page.goto('/');

    const pagination = page.getByRole('navigation').filter({ has: page.getByRole('button') });
    await expect(pagination.first()).toBeVisible();

    await page.getByRole('button', { name: 'Go to page 2' }).click();
    await expect(page).toHaveURL(/page=2/);
  });

  test('every card shows a category icon rather than a repeated placeholder', async ({ page }) => {
    await page.goto('/');

    const cards = page.locator('.MuiCard-root');
    await expect(cards.first()).toBeVisible();

    await expect(page.locator('img[src*="placeholder.svg"]')).toHaveCount(0);
  });

  test('the header offers signing in, not a dashboard that would bounce', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('link', { name: 'Sign in' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Dashboard' })).toHaveCount(0);
  });

  test('the cart stays reachable on a product page', async ({ page }) => {
    await page.goto('/');

    await page.locator(PRODUCT_LINK).first().click();
    await expect(page.getByRole('button', { name: 'Add to cart' })).toBeVisible();

    await expect(page.getByRole('button', { name: 'Open cart' })).toBeVisible();
  });

  test('the mini cart opens in place and says when it is empty', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('button', { name: 'Open cart' }).click();

    await expect(page.getByText('Your cart is empty')).toBeVisible();
    await expect(page).toHaveURL(/\/$/);
  });

  test('the mini cart lists what was added and leads to the checkout', async ({ page }) => {
    await page.goto('/');
    await page.locator(PRODUCT_LINK).first().click();
    await page.getByRole('button', { name: 'Add to cart' }).click();

    await page.getByRole('button', { name: 'Open cart' }).click();

    await expect(page.getByText('Subtotal')).toBeVisible();
    await page.getByRole('link', { name: 'Check out' }).click();

    await expect(page).toHaveURL(/\/product\/checkout/);
  });

  test('the sign-up address leads to sign-in, since registration is hidden', async ({ page }) => {
    await page.goto('/auth/jwt/sign-up');

    await expect(page).toHaveURL(/sign-in/);
    await expect(page.getByText('Get started')).toHaveCount(0);
  });

  test('the sign-in screen offers a way back to the shop', async ({ page }) => {
    await page.goto('/auth/jwt/sign-in');

    await page.getByRole('link', { name: 'Back to the shop' }).click();

    await expect(page.getByRole('heading', { name: 'Shop' })).toBeVisible();
  });
});
