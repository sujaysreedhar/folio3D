import { test, expect } from '@playwright/test';

for (const width of [320, 390, 900])
  test(`toolbar adapts to ${width}px reader width with accessible secondary controls`, async ({
    page,
  }) => {
    await page.goto('/reader-probe.html');
    await page.evaluate(async (width) => {
      const r = (window as any).reader;
      const mount = document.querySelector('#one') as HTMLElement;
      mount.style.width = `${width}px`;
      const b = r.createFlipbook(mount, { source: r.images, renderer: 'flat' });
      Object.assign(window, { book: b });
      await b.ready;
    }, width);
    const more = page.getByRole('button', { name: 'More controls', exact: true });
    const zoom = page.getByRole('button', { name: 'Zoom in', exact: true });
    if (width < 720) {
      await expect(more).toBeVisible();
      await expect(zoom).toBeHidden();
      await more.click();
      await expect(more).toHaveAttribute('aria-expanded', 'true');
      await zoom.click();
      await expect.poll(() => page.evaluate(() => (window as any).book.getState().zoom)).toBe(1.25);
      await page.keyboard.press('Escape');
      await expect(zoom).toBeHidden();
      await expect(more).toBeFocused();
      await more.click();
      await page.getByRole('button', { name: 'Browse book' }).click();
      await expect(more).toHaveAttribute('aria-expanded', 'false');
      await expect(page.locator('.folio3d-navigation')).toBeVisible();
    } else {
      await expect(more).toBeHidden();
      await expect(zoom).toBeVisible();
    }
    expect(
      await page.locator('#one .folio3d').evaluate((root) => root.scrollWidth <= root.clientWidth),
    ).toBe(true);
    for (const name of ['Browse book', 'Previous page', 'Next page']) {
      const box = await page.getByRole('button', { name, exact: true }).boundingBox();
      expect(box!.height).toBeGreaterThanOrEqual(44);
    }
  });

test('expanding the reader restores desktop controls and closes More', async ({ page }) => {
  await page.goto('/reader-probe.html');
  await page.evaluate(async () => {
    const r = (window as any).reader,
      mount = document.querySelector('#one') as HTMLElement;
    mount.style.width = '390px';
    const b = r.createFlipbook(mount, { source: r.images, renderer: 'flat' });
    await b.ready;
  });
  const more = page.getByRole('button', { name: 'More controls' });
  await more.click();
  await page.locator('#one').evaluate((mount: HTMLElement) => {
    mount.style.width = '900px';
  });
  await expect(more).toBeHidden();
  await expect(page.getByRole('button', { name: 'Zoom in', exact: true })).toBeVisible();
  await page.locator('#one').evaluate((mount: HTMLElement) => {
    mount.style.width = '390px';
  });
  await expect(more).toBeVisible();
  await expect(more).toHaveAttribute('aria-expanded', 'false');
});

test('Escape on the More trigger dismisses controls before the lightbox', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/reader-probe.html');
  await page.evaluate(async () => {
    const r = (window as any).reader;
    const b = r.openFlipbook({ source: r.images, renderer: 'flat' });
    await b.ready;
  });
  const dialog = page.getByRole('dialog'),
    more = dialog.getByRole('button', { name: 'More controls' });
  await more.click();
  await page.keyboard.press('Shift+Tab');
  await expect(more).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeVisible();
  await expect(more).toHaveAttribute('aria-expanded', 'false');
  await expect(more).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
});

test('narrowing a reader transfers focus from hidden secondary controls to More', async ({
  page,
}) => {
  await page.goto('/reader-probe.html');
  await page.evaluate(async () => {
    const r = (window as any).reader;
    const b = r.createFlipbook(document.querySelector('#one'), {
      source: r.images,
      renderer: 'flat',
    });
    await b.ready;
  });
  await page.getByRole('button', { name: 'Zoom in', exact: true }).focus();
  await page.locator('#one').evaluate((mount: HTMLElement) => {
    mount.style.width = '390px';
  });
  await expect(page.getByRole('button', { name: 'More controls' })).toBeFocused();
});
