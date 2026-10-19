import { test, expect } from '@playwright/test';

const ROUTES = ['/', '/radio', '/favorites', '/recorder'];

test('loads and navigates all 4 routes without console errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });
  page.on('pageerror', (err) => errors.push(err.message));

  for (const route of ROUTES) {
    await page.goto(route);
    await expect(page.locator('body')).toBeVisible();
  }

  expect(errors).toEqual([]);
});

test('switching theme updates data-theme on <html>', async ({ page }) => {
  await page.goto('/');
  const html = page.locator('html');
  await expect(html).toHaveAttribute('data-theme', 'dark');

  await page.getByRole('button', { name: 'Tema light' }).click();
  await expect(html).toHaveAttribute('data-theme', 'light');

  await page.getByRole('button', { name: 'Tema neon' }).click();
  await expect(html).toHaveAttribute('data-theme', 'neon');
});

test('mobile sidebar stays off-screen when closed', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/radio');
  await expect(page.getByText('Emisoras de radio')).toBeVisible();

  const logoBox = await page.locator('aside h1').boundingBox();
  expect(logoBox).not.toBeNull();
  expect(logoBox!.x + logoBox!.width).toBeLessThanOrEqual(0);
});

test('a non-existent station uuid does not crash the radio page', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(err.message));

  await page.goto('/station/uuid-inexistente');
  await expect(page.getByText('Emisoras de radio')).toBeVisible();
  expect(errors).toEqual([]);
});
