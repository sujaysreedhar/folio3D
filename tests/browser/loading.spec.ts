import { expect, test } from '@playwright/test';

test('PDF downloads report byte progress and show an accessible progress bar', async ({ page }) => {
  await page.goto('/reader-probe.html');
  const progress = await page.evaluate(async () => {
    const r = (window as any).reader;
    const book = r.createFlipbook(document.querySelector('#one'), {
      source: { type: 'pdf', data: '/samples/magazine.pdf' },
      renderer: 'flat',
      assetBaseUrl: '/lib/assets/',
    });
    const progress: Array<{ loaded: number; total?: number; label: string | null }> = [];
    book.on('loadprogress', (value: { loaded: number; total?: number }) =>
      progress.push({
        ...value,
        label: document.querySelector('progress')?.getAttribute('aria-label') ?? null,
      }),
    );
    await book.ready;
    book.destroy();
    return progress;
  });
  expect(progress.length).toBeGreaterThan(0);
  expect(progress.some((value) => value.loaded > 0)).toBe(true);
  for (const value of progress) {
    expect(value.label).toBe('PDF download progress');
    if (value.total !== undefined) expect(value.total).toBeGreaterThanOrEqual(value.loaded);
  }
});

test('closing a pending remote PDF rejects ready before the response arrives', async ({ page }) => {
  let started!: () => void, release!: () => void;
  const requested = new Promise<void>((resolve) => {
    started = resolve;
  });
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route('**/held.pdf', async (route) => {
    started();
    await gate;
    await route.abort().catch(() => {});
  });
  await page.goto('/reader-probe.html');
  await page.evaluate(() => {
    (window as any).pendingBook = (window as any).reader.createFlipbook(
      document.querySelector('#one'),
      {
        source: { type: 'pdf', data: '/held.pdf' },
        renderer: 'flat',
        assetBaseUrl: '/lib/assets/',
      },
    );
  });
  await requested;
  const outcome = await page.evaluate(async () => {
    const book = (window as any).pendingBook;
    book.destroy();
    return Promise.race([
      book.ready.catch((e: Error) => e.name),
      new Promise((resolve) => setTimeout(() => resolve('still pending'), 250)),
    ]);
  });
  release();
  expect(outcome).toBe('AbortError');
  await expect(page.locator('.folio3d')).toHaveCount(0);
});

test('destroying a PDF during local file conversion settles promptly and permits a new reader', async ({
  page,
}) => {
  await page.goto('/reader-probe.html');
  const result = await page.evaluate(async () => {
    const r = (window as any).reader;
    const bytes = await (await fetch('/samples/magazine.pdf')).arrayBuffer();
    let release!: () => void, started!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const converting = new Promise<void>((resolve) => {
      started = resolve;
    });
    class SlowFile extends Blob {
      async arrayBuffer() {
        started();
        await gate;
        return super.arrayBuffer();
      }
    }
    const old = r.createFlipbook(document.querySelector('#one'), {
      source: { type: 'pdf', data: new SlowFile([bytes]) },
      renderer: 'flat',
      assetBaseUrl: '/lib/assets/',
    });
    let errors = 0;
    old.on('error', () => errors++);
    await converting;
    old.destroy();
    const fresh = r.createFlipbook(document.querySelector('#one'), {
      source: r.images,
      renderer: 'flat',
    });
    const outcome = await Promise.race([
      old.ready.catch((e: Error) => e.name),
      new Promise((resolve) => setTimeout(() => resolve('still pending'), 250)),
    ]);
    release();
    await fresh.ready;
    await old.ready.catch(() => {});
    const result = {
      outcome,
      errors,
      readers: document.querySelectorAll('.folio3d').length,
      status: fresh.getState().status,
    };
    fresh.destroy();
    return result;
  });
  expect(result).toEqual({ outcome: 'AbortError', errors: 0, readers: 1, status: 'ready' });
});

test('an initial render failure emits one error event', async ({ page }) => {
  let requests = 0;
  await page.route('**/samples/page-1.svg', async (route) => {
    if (++requests === 1) await route.continue();
    else await route.fulfill({ status: 503, body: 'Unavailable' });
  });
  await page.goto('/reader-probe.html');
  const errors = await page.evaluate(async () => {
    const r = (window as any).reader;
    const book = r.createFlipbook(document.querySelector('#one'), {
      source: r.images,
      renderer: 'flat',
    });
    const errors: string[] = [];
    book.on('error', (e: Error) => errors.push(e.message));
    await book.ready.catch(() => {});
    book.destroy();
    return errors;
  });
  expect(errors).toHaveLength(1);
  expect(errors[0]).toContain('503');
});

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
