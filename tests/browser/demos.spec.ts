import { test, expect } from '@playwright/test';
import { resolve } from 'node:path';

test('home links to all three demo apps', async ({ page }) => {
  await page.goto('/');
  for (const [name, path] of [
    ['Explore the catalog', 'catalog'],
    ['Explore the portfolio', 'portfolio'],
    ['Visit the reading room', 'bookshelf'],
  ]) {
    const link = page.getByRole('link', { name: name! });
    await expect(link).toHaveAttribute('href', `./demos/${path}.html`);
    await link.click();
    await expect(page.locator('h1')).toBeVisible();
    await page.goBack();
  }
});

test('catalog shortcuts follow the reader and lightbox keeps the current page', async ({
  page,
}) => {
  await page.goto('/demos/catalog.html');
  const book = page.getByRole('region', { name: 'Form & Field catalog' });
  await expect(book).toHaveAttribute('data-status', 'ready');
  await page.getByRole('button', { name: 'Lighting', exact: true }).click();
  await expect(book.getByRole('spinbutton', { name: 'Page number' })).toHaveValue('4');
  await expect(page.getByRole('button', { name: 'Lighting', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.getByRole('button', { name: 'Open lightbox' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.locator('.folio3d')).toHaveAttribute('data-status', 'ready');
  await expect(dialog.getByRole('spinbutton', { name: 'Page number' })).toHaveValue('4');
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Open lightbox' })).toBeFocused();
});

test('portfolio project buttons select a single page and update the project note', async ({
  page,
}) => {
  await page.goto('/demos/portfolio.html');
  const book = page.getByRole('region', { name: 'Studio North portfolio' });
  await expect(book).toHaveAttribute('data-status', 'ready');
  await page.getByRole('button', { name: 'Courtyard house', exact: true }).click();
  await expect(book.getByRole('spinbutton', { name: 'Page number' })).toHaveValue('3');
  await expect(book.getByRole('img')).toHaveAttribute('aria-label', /Page 3 of 6\./);
  await expect(page.locator('#project-note')).toContainText(
    'A home arranged around an open garden',
  );
  await book.getByRole('button', { name: 'Next page', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Objects in balance', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
});

test('catalog remains usable after navigating away and back', async ({ page }) => {
  await page.goto('/demos/catalog.html');
  const book = page.getByRole('region', { name: 'Form & Field catalog' });
  await expect(book).toHaveAttribute('data-status', 'ready');
  await page.getByRole('link', { name: 'Portfolio', exact: true }).click();
  await expect(page.locator('h1')).toBeVisible();
  await page.goBack();
  await expect(book).toHaveAttribute('data-status', 'ready');
  await page.getByRole('button', { name: 'Lighting', exact: true }).click();
  await expect(book.getByRole('spinbutton', { name: 'Page number' })).toHaveValue('4');
});

test('persisted page transitions preserve the inline reader', async ({ page }) => {
  await page.goto('/demos/catalog.html');
  const book = page.getByRole('region', { name: 'Form & Field catalog' });
  await expect(book).toHaveAttribute('data-status', 'ready');
  await page.evaluate(() => {
    // Exercise the BFCache lifecycle even when the engine declines to cache a page.
    dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true }));
    dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }));
  });
  await expect(book).toHaveAttribute('data-status', 'ready');
  await page.getByRole('button', { name: 'Lighting', exact: true }).click();
  await expect(book.getByRole('spinbutton', { name: 'Page number' })).toHaveValue('4');
});

test('reading room opens each publication and restores focus on close', async ({ page }) => {
  await page.goto('/demos/bookshelf.html');
  for (const title of ['Fieldnotes magazine', 'Form & Field catalog', 'Studio North portfolio']) {
    const opener = page.getByRole('button', { name: `Read ${title}`, exact: true });
    await opener.click();
    const dialog = page.getByRole('dialog', { name: title });
    await expect(dialog.locator('.folio3d')).toHaveAttribute('data-status', 'ready');
    await dialog.getByRole('button', { name: 'Next page', exact: true }).click();
    await expect(dialog.getByRole('spinbutton', { name: 'Page number' })).toHaveValue('2');
    if (title === 'Fieldnotes magazine') {
      await expect(dialog.getByRole('link', { name: 'Original PDF' })).toHaveAttribute(
        'href',
        /\/samples\/magazine\.pdf$/,
      );
    }
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(opener).toBeFocused();
  }
});

test('reading room reads a local PDF without uploading it', async ({ page }) => {
  await page.goto('/demos/bookshelf.html');
  const uploads: string[] = [];
  page.on('request', (request) => {
    if (['POST', 'PUT', 'PATCH'].includes(request.method())) uploads.push(request.url());
  });
  await page.getByLabel('Choose a PDF').setInputFiles(resolve('tests/fixtures/magazine.pdf'));
  const dialog = page.getByRole('dialog', { name: 'magazine.pdf', exact: true });
  await expect(dialog.locator('.folio3d')).toHaveAttribute('data-status', 'ready');
  await expect(dialog.getByRole('spinbutton', { name: 'Page number' })).toHaveAttribute('max', '6');
  expect(uploads).toEqual([]);
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
});

test('demo pages fit the viewport and respect reduced motion', async ({ page }, info) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const path of ['catalog', 'portfolio', 'bookshelf']) {
    await page.goto(`/demos/${path}.html`);
    await expect(page.locator('h1')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      await page.evaluate(() => window.innerWidth),
    );
    if (path !== 'bookshelf') {
      await expect(page.locator('#demo-book .folio3d')).toHaveAttribute('data-status', 'ready');
      await expect(page.locator('#demo-book .folio3d')).toHaveAttribute('data-renderer', 'flat');
    }
    await page.screenshot({
      path: `artifacts/demo-${path}-${info.project.name}.png`,
      fullPage: true,
    });
  }
});
