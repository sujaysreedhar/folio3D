import { test, expect } from '@playwright/test';
for (const path of ['/nested/', '/nested/minified.html', '/npm/'])
  test(`${path} consumer loads PDF and navigates`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(path);
    await expect(page.locator('.folio3d')).toHaveAttribute('data-status', 'ready');
    await expect(page.getByRole('spinbutton', { name: 'Page number' })).toHaveValue('1');
    await page.getByRole('button', { name: 'Next page', exact: true }).click();
    await expect(page.getByRole('spinbutton', { name: 'Page number' })).toHaveValue('2');
    await page.getByRole('button', { name: 'Browse book' }).click();
    await expect(page.locator('.folio3d-thumbnails canvas')).toHaveCount(6);
    await page.getByRole('button', { name: 'Close navigation' }).click();
    await page.getByRole('button', { name: 'Bookmark this page', exact: true }).click();
    await expect(
      page.getByRole('button', { name: 'Remove bookmark for this page' }),
    ).toHaveAttribute('aria-pressed', 'true');
    expect(errors).toEqual([]);
  });

test('minified distribution is smaller and keeps matching minified chunks', async ({ request }) => {
  const regular = await request.get('/nested/lib/folio3d.js');
  const compact = await request.get('/nested/lib/folio3d.min.js');
  const css = await request.get('/nested/lib/folio3d.min.css');
  expect(compact.status()).toBe(200);
  expect(css.status()).toBe(200);
  expect((await compact.body()).length).toBeLessThan((await regular.body()).length * 0.9);
  expect(await compact.text()).toContain('.min.js');
});

test('minified browser entry turns 3D pages with lazy PDF chunks', async ({ page }) => {
  const errors: string[] = [];
  const chunks: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('request', (request) => {
    if (request.url().includes('/chunks/')) chunks.push(request.url());
  });
  await page.goto('/nested/minified.html?webgl');
  await expect(page.locator('.folio3d')).toHaveAttribute('data-status', 'ready');
  await expect(page.locator('.folio3d')).toHaveAttribute('data-renderer', 'webgl');
  await page.getByRole('button', { name: 'Next page', exact: true }).click();
  await expect(page.getByRole('spinbutton', { name: 'Page number' })).toHaveValue('2');
  await expect(page.locator('.folio3d')).toHaveAttribute('data-status', 'ready');
  expect(chunks.length).toBeGreaterThan(0);
  expect(chunks.every((url) => url.endsWith('.min.js'))).toBe(true);
  expect(errors).toEqual([]);
});
test('missing worker assets produce a visible useful failure', async ({ page, context }) => {
  await context.route('**/pdf.worker.min.mjs', (route) => route.abort());
  await page.goto('/nested/');
  await expect(page.locator('.folio3d')).toHaveAttribute('data-status', 'error');
  await expect(page.getByRole('alert')).toContainText(/worker|assetBaseUrl/i);
});
test('static showcase supports image-only loading, sample/local PDF and lightbox', async ({
  page,
}, info) => {
  const pdfRequests: string[] = [];
  page.on('request', (req) => {
    if (/pdf[-.]|\.pdf$/.test(req.url())) pdfRequests.push(req.url());
  });
  await page.goto('/showcase/');
  await expect(page.locator('.folio3d')).toHaveAttribute('data-status', 'ready');
  expect(pdfRequests).toEqual([]);
  await page.screenshot({ path: `artifacts/demo-${info.project.name}.png`, fullPage: true });
  await page.getByRole('button', { name: 'Sample PDF', exact: true }).click();
  await expect(page.locator('#publication-status')).toHaveText('Sample PDF · 6 pages');
  await page.getByRole('button', { name: 'Open lightbox' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.locator('#file').setInputFiles('tests/fixtures/mixed.pdf');
  await expect(page.locator('#publication-status')).toHaveText('mixed.pdf · 4 pages');
});
test('mobile showcase fits the viewport', async ({ page }, info) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/showcase/');
  await expect(page.locator('.folio3d')).toHaveAttribute('data-status', 'ready');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: `artifacts/demo-${info.project.name}-390.png`, fullPage: true });
});

test('theme selector updates the production reader and lightbox', async ({ page }, info) => {
  await page.goto('/showcase/');
  await expect(page.locator('.folio3d')).toHaveAttribute('data-status', 'ready');
  for (const theme of ['classic', 'modern', 'sepia', 'midnight']) {
    await page.getByRole('combobox', { name: 'Theme', exact: true }).selectOption(theme);
    await expect(page.locator('.folio3d')).toHaveAttribute('data-theme', theme);
    if (theme === 'midnight') {
      await expect(page.locator('.folio3d-toolbar')).toHaveCSS(
        'background-color',
        'rgb(37, 33, 46)',
      );
      await expect(page.locator('.folio3d')).toHaveCSS('background-color', 'rgb(23, 20, 30)');
    }
    await page.getByRole('button', { name: 'Browse book' }).click();
    await expect(page.locator('.folio3d-thumbnails canvas')).toHaveCount(6);
    await page
      .locator('#book')
      .screenshot({ path: `artifacts/theme-${theme}-${info.project.name}.png` });
    await page.getByRole('button', { name: 'Close navigation' }).click();
  }
  await page.getByRole('button', { name: 'Open lightbox' }).click();
  await expect(page.getByRole('dialog')).toHaveAttribute('data-theme', 'midnight');
  await expect(page.getByRole('dialog').locator('.folio3d')).toHaveAttribute(
    'data-theme',
    'midnight',
  );
});
