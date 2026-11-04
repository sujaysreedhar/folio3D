import { test, expect } from '@playwright/test';
import { resolve } from 'node:path';

test('homepage can retry a failed PDF without reloading and preserves mute', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 844 });
  let fail = true;
  await page.route('**/samples/magazine.pdf', (route) =>
    fail ? route.fulfill({ status: 503, body: 'Temporarily unavailable' }) : route.continue(),
  );
  await page.goto('/');
  await expect(page.locator('#book .folio3d')).toHaveAttribute('data-status', 'ready');
  const more = page.getByRole('button', { name: 'More controls' });
  if (await more.isVisible()) await more.click();
  await page.getByRole('button', { name: 'Mute page-turn sound', exact: true }).click();
  await page.getByRole('button', { name: 'Sample PDF', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Check your connection');
  expect(await page.getByRole('alert').evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(
    true,
  );
  await expect(page.getByRole('button', { name: 'Retry', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Open lightbox' })).toBeDisabled();
  fail = false;
  await page.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect(page.locator('#publication-status')).toHaveText('Sample PDF · 6 pages');
  await expect(page.getByRole('button', { name: 'Retry', exact: true })).toBeHidden();
  if (await more.isVisible()) await more.click();
  await expect(
    page.getByRole('button', { name: 'Enable page-turn sound', exact: true }),
  ).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('#book .folio3d')).toHaveCount(1);
});

test('switching away from a pending PDF keeps the new reader and lightbox current', async ({
  page,
}) => {
  let started!: () => void, release!: () => void, completed!: () => void;
  const requested = new Promise<void>((resolve) => {
    started = resolve;
  });
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const finished = new Promise<void>((resolve) => {
    completed = resolve;
  });
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.route('**/samples/magazine.pdf', async (route) => {
    started();
    await gate;
    await route.continue().catch(() => {});
    completed();
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Sample PDF', exact: true }).click();
  await requested;
  await page.getByRole('button', { name: 'Image book', exact: true }).click();
  await expect(page.locator('#publication-status')).toHaveText('Image book · 6 pages');
  release();
  await finished;
  await expect(page.locator('#book .folio3d')).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Retry', exact: true })).toBeHidden();
  await page.getByRole('button', { name: 'Open lightbox' }).click();
  await expect(
    page.getByRole('dialog', { name: 'Image book', exact: true }).locator('.folio3d'),
  ).toHaveAttribute('data-status', 'ready');
  expect(errors).toEqual([]);
});

test('homepage controls fit a narrow screen and expose upload keyboard focus', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await page.goto('/');
  await expect(page.locator('#book')).toHaveAttribute('aria-busy', 'false');
  await expect(page.getByRole('button', { name: 'Open lightbox' })).toBeEnabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  await page.locator('#file').focus();
  await expect(page.locator('label[for="file"]')).toHaveCSS('outline-style', 'solid');
  await page.getByRole('button', { name: 'Sample PDF', exact: true }).click();
  await expect(page.locator('#publication-status')).toHaveText('Sample PDF · 6 pages');
  await expect(page.locator('#book')).toHaveAttribute('aria-busy', 'false');
});

test('homepage reader survives persisted navigation and remains interactive', async ({
  page,
}, info) => {
  await page.goto('/');
  const book = page.getByRole('region', { name: 'Image book', exact: true });
  await expect(book).toHaveAttribute('data-status', 'ready');
  await page.evaluate(() => {
    dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true }));
    dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }));
  });
  await expect(book).toHaveAttribute('data-status', 'ready');
  await book.getByRole('button', { name: 'Next page', exact: true }).click();
  await expect(book.getByRole('spinbutton', { name: 'Page number' })).toHaveValue(
    info.project.name.endsWith('mobile') ? '3' : '4',
  );
});

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
      const more = dialog.getByRole('button', { name: 'More controls' });
      if (await more.isVisible()) await more.click();
      await expect(dialog.getByRole('link', { name: 'Original PDF' })).toHaveAttribute(
        'href',
        /\/samples\/magazine\.pdf$/,
      );
      if (await more.isVisible()) await page.keyboard.press('Escape');
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
