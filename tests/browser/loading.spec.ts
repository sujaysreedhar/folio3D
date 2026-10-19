import { expect, test } from '@playwright/test';

test('flat readers skip the WebGL chunk and WebGL import failures fall back safely', async ({
  page,
}) => {
  const chunks: string[] = [];
  page.on('request', (request) => {
    if (/webgl/i.test(request.url())) chunks.push(request.url());
  });
  await page.goto('/reader-probe.html');
  await page.evaluate(async () => {
    const r = (window as any).reader;
    const book = r.createFlipbook(document.querySelector('#one'), {
      source: r.images,
      renderer: 'flat',
    });
    await book.ready;
    book.destroy();
  });
  expect(chunks.some((url) => /webgl/i.test(url))).toBe(false);
  await page.route('**/*webgl*', (route) => route.abort());
  const renderer = await page.evaluate(async () => {
    const r = (window as any).reader;
    const book = r.createFlipbook(document.querySelector('#one'), {
      source: r.images,
      renderer: 'webgl',
    });
    await book.ready;
    const renderer = book.getState().renderer;
    book.destroy();
    return renderer;
  });
  expect(renderer).toBe('flat');
});

test('destroying during lazy renderer loading never installs a late renderer', async ({ page }) => {
  await page.goto('/reader-probe.html');
  await page.route('**/*webgl*', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 100));
    await route.continue().catch(() => {});
  });
  const result = await page.evaluate(async () => {
    const r = (window as any).reader;
    const book = r.createFlipbook(document.querySelector('#one'), {
      source: r.images,
      renderer: 'webgl',
    });
    book.destroy();
    const error = await book.ready.catch((e: Error) => e.name);
    await new Promise((resolve) => setTimeout(resolve, 150));
    return {
      error,
      count: document.querySelectorAll('.folio3d-canvas').length,
      status: book.getState().status,
    };
  });
  expect(result).toEqual({ error: 'AbortError', count: 0, status: 'destroyed' });
});
