import { test, expect, type Page } from '@playwright/test';

async function mount(page: Page, options: Record<string, unknown> = {}) {
  await page.goto('/reader-probe.html');
  await page.waitForFunction(() => !!(window as any).reader);
  await page.evaluate(async (options) => {
    const r = (window as any).reader;
    const book = r.createFlipbook(document.querySelector('#one'), {
      source: r.images,
      renderer: 'flat',
      duration: 0,
      ...options,
    });
    Object.assign(window, { book });
    await book.ready;
  }, options);
}

test('thumbnail navigation renders a bounded batch and jumps to the selected page', async ({
  page,
}) => {
  await mount(page);
  await page.getByRole('button', { name: 'Browse book' }).click();
  await expect(page.locator('.folio3d-thumbnails canvas')).toHaveCount(6);
  await page.getByRole('button', { name: 'Go to page 5', exact: true }).click();
  await expect.poll(() => page.evaluate(() => (window as any).book.getState().page)).toBe(5);
  await page.getByRole('button', { name: 'Close navigation' }).click();
  await expect(page.locator('.folio3d-thumbnails canvas')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Browse book' })).toBeFocused();
});

test('contents supports nested entries and safely renders titles', async ({ page }) => {
  await mount(page, {
    contents: [
      { title: 'Start <img src=x>', page: 1, children: [{ title: 'Chapter two', page: 4 }] },
    ],
  });
  await page.getByRole('button', { name: 'Browse book' }).click();
  await page.getByRole('button', { name: 'Contents', exact: true }).click();
  await expect(page.getByText('Start <img src=x>', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'Chapter two, page 4' }).click();
  await expect.poll(() => page.evaluate(() => (window as any).book.getState().page)).toBe(4);
});

test('bookmarks persist only with a document storage key and can be removed', async ({ page }) => {
  await mount(page, { storageKey: 'test-publication' });
  await page.getByRole('button', { name: 'Bookmark this page', exact: true }).click();
  expect(await page.evaluate(() => (window as any).book.getBookmarks())).toEqual([1]);
  await mount(page, { storageKey: 'another-publication' });
  expect(await page.evaluate(() => (window as any).book.getBookmarks())).toEqual([]);
  await mount(page, { storageKey: 'test-publication' });
  expect(await page.evaluate(() => (window as any).book.getBookmarks())).toEqual([1]);
  await page.getByRole('button', { name: 'Browse book' }).click();
  await page.getByRole('button', { name: 'Bookmarks', exact: true }).click();
  await page.getByRole('button', { name: 'Remove bookmark for page 1' }).click();
  await expect(page.getByText('No bookmarks yet.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Bookmarks', exact: true })).toBeFocused();
  expect(await page.evaluate(() => (window as any).book.getBookmarks())).toEqual([]);
});

test('themes switch independently and expose state and events', async ({ page }) => {
  await mount(page, { theme: 'modern' });
  await expect(page.locator('#one .folio3d')).toHaveAttribute('data-theme', 'modern');
  const result = await page.evaluate(async () => {
    const r = (window as any).reader,
      b = (window as any).book;
    const other = r.createFlipbook(document.querySelector('#two'), {
      source: r.images,
      renderer: 'flat',
    });
    await other.ready;
    const events: string[] = [];
    b.on('themechange', (s: any) => events.push(s.theme));
    b.setTheme('midnight');
    return { theme: b.getState().theme, other: other.getState().theme, events };
  });
  expect(result).toEqual({ theme: 'midnight', other: 'classic', events: ['midnight'] });
  await expect(page.locator('#one .folio3d')).toHaveAttribute('data-theme', 'midnight');
});

test('navigation is usable with keyboard, empty contents and blocked storage', async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw new Error('Storage blocked');
    };
    Storage.prototype.getItem = () => {
      throw new Error('Storage blocked');
    };
  });
  await mount(page, { storageKey: 'blocked' });
  await page.getByRole('button', { name: 'Bookmark this page', exact: true }).click();
  expect(await page.evaluate(() => (window as any).book.getBookmarks())).toEqual([1]);
  await page.getByRole('button', { name: 'Browse book' }).click();
  await page.getByRole('button', { name: 'Contents', exact: true }).click();
  await expect(page.getByText('No contents available for this book.')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Browse book' })).toBeFocused();
  expect(await page.evaluate(() => (window as any).book.getState().page)).toBe(1);
});

test('PDF outline resolves nested and named page destinations', async ({ page }) => {
  await mount(page, {
    source: { type: 'pdf', data: '/samples/magazine.pdf' },
    assetBaseUrl: '/lib/assets/',
  });
  const contents = await page.evaluate(() => (window as any).book.getContents());
  expect(contents[0].page).toBe(1);
  expect(contents[0].children[0].page).toBe(2);
  expect(contents[1].page).toBe(5);
  await page.getByRole('button', { name: 'Browse book' }).click();
  await page.getByRole('button', { name: 'Contents', exact: true }).click();
  await page.getByRole('button', { name: 'A new perspective, page 5' }).click();
  await expect.poll(() => page.evaluate(() => (window as any).book.getState().page)).toBe(5);
});

test('thumbnail paging stays bounded and destroy discards work', async ({ page }) => {
  await mount(page, {
    source: {
      type: 'images',
      pages: Array.from({ length: 50 }, (_, i) => ({ src: `/samples/page-${(i % 6) + 1}.svg` })),
    },
  });
  await page.getByRole('button', { name: 'Browse book' }).click();
  await expect(page.locator('.folio3d-thumbnails canvas')).toHaveCount(6);
  await page.evaluate(() =>
    Object.assign(window, {
      oldCanvases: [...document.querySelectorAll('.folio3d-thumbnails canvas')],
    }),
  );
  await page.getByRole('button', { name: 'Next thumbnails', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Next thumbnails', exact: true })).toBeFocused();
  await expect(page.locator('.folio3d-thumbnails canvas')).toHaveCount(6);
  expect(
    await page.evaluate(() =>
      (window as any).oldCanvases.every((c: HTMLCanvasElement) => c.width === 0),
    ),
  ).toBe(true);
  await page.getByRole('button', { name: 'Go to page 10', exact: true }).click();
  await expect.poll(() => page.evaluate(() => (window as any).book.getState().page)).toBe(10);
  await page.evaluate(() => (window as any).book.destroy());
  await expect(page.locator('.folio3d')).toHaveCount(0);
});

test('bookmark state follows navigation and invalid storage entries are ignored', async ({
  page,
}) => {
  await page.goto('/reader-probe.html');
  await page.evaluate(() =>
    localStorage.setItem('folio3d:bookmarks:corrupt', '[0,1,1,99,"2",null]'),
  );
  await mount(page, { storageKey: 'corrupt' });
  expect(await page.evaluate(() => (window as any).book.getBookmarks())).toEqual([1]);
  await expect(page.getByRole('button', { name: 'Remove bookmark for this page' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.evaluate(() => (window as any).book.goToPage(4));
  await expect(
    page.getByRole('button', { name: 'Bookmark this page', exact: true }),
  ).toHaveAttribute('aria-pressed', 'false');
});

test('lightbox Escape closes navigation before closing the book', async ({ page }) => {
  await mount(page);
  await page.evaluate(async () => {
    const r = (window as any).reader;
    const modal = r.openFlipbook({ source: r.images, renderer: 'flat', theme: 'midnight' });
    await modal.ready;
  });
  const modal = page.getByRole('dialog');
  await modal.getByRole('button', { name: 'Browse book' }).click();
  await page.keyboard.press('Escape');
  await expect(modal).toBeVisible();
  await expect(modal.getByRole('button', { name: 'Browse book' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(modal).toHaveCount(0);
});

test('thumbnails share the configured allocation budget', async ({ page }) => {
  await mount(page, { memoryBudgetMB: 1 });
  await page.getByRole('button', { name: 'Browse book' }).click();
  await expect(page.locator('.folio3d-thumbnails canvas')).toHaveCount(6);
  const bytes = await page.evaluate(() => {
    const book = (window as any).book;
    return (
      book.scheduler.stats().bytes +
      book.navigation.surfaces.reduce((sum: number, surface: any) => sum + surface.bytes, 0)
    );
  });
  expect(bytes).toBeLessThanOrEqual(1024 * 1024);
});

test('same-document readers synchronize bookmarks without overwriting one another', async ({
  page,
}) => {
  await mount(page, { storageKey: 'shared-bookmarks' });
  const result = await page.evaluate(async () => {
    const r = (window as any).reader,
      inline = (window as any).book;
    inline.toggleBookmark(1);
    const modal = r.openFlipbook({
      source: r.images,
      renderer: 'flat',
      storageKey: 'shared-bookmarks',
    });
    await modal.ready;
    modal.toggleBookmark(3);
    const inlineAfterModal = inline.getBookmarks();
    modal.destroy();
    inline.toggleBookmark(5);
    return {
      inlineAfterModal,
      saved: JSON.parse(localStorage.getItem('folio3d:bookmarks:shared-bookmarks')!),
    };
  });
  expect(result).toEqual({ inlineAfterModal: [1, 3], saved: [1, 3, 5] });
});
