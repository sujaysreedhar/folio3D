import { test, expect } from '@playwright/test';
import { resolve } from 'node:path';
test.beforeEach(async ({ page, context }) => {
  await context.route('**/test-assets/**', (route) =>
    route.fulfill({
      path: resolve(
        'dist/assets',
        new URL(route.request().url()).pathname.split('/test-assets/')[1]!,
      ),
    }),
  );
  await context.route('**/fixtures/**', (route) =>
    route.fulfill({
      path: resolve(
        'tests/fixtures',
        new URL(route.request().url()).pathname.split('/fixtures/')[1]!,
      ),
    }),
  );
  await page.goto('/provider-probe.html');
  await page.waitForFunction(() => !!(window as any).documents);
});
test('opens text, scanned, rotated/mixed and large PDFs on demand', async ({ page }) => {
  for (const [name, count] of [
    ['magazine', 6],
    ['scanned', 3],
    ['mixed', 4],
    ['large', 200],
  ] as const) {
    const result = await page.evaluate(
      async ({ name }) => {
        const { openDocument, RenderScheduler } = (window as any).documents,
          signal = new AbortController().signal;
        const p = await openDocument(
          { type: 'pdf', data: `/fixtures/${name}.pdf` },
          `${location.origin}/test-assets/`,
          signal,
        );
        const s = new RenderScheduler(p, 1024 * 1024);
        const surfaces = await s.prepare([1], { width: 600, height: 800 });
        const canvas = surfaces.get(1).canvas,
          rgba = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
        const result = {
          count: p.pageCount,
          ink: Array.from(rgba as Uint8Array).some((v, i) => i % 4 !== 3 && v < 200),
          stats: s.stats(),
          rotated: name === 'mixed' ? await p.size(3, signal) : null,
        };
        s.dispose();
        p.dispose();
        return result;
      },
      { name },
    );
    expect(result.count).toBe(count);
    expect(result.ink).toBe(true);
    expect(result.stats.renderedPages).toBe(1);
    expect(result.stats.bytes).toBeLessThanOrEqual(1024 * 1024);
    if (name === 'mixed') expect(result.rotated).toEqual({ width: 800, height: 600 });
  }
});
test('copies caller-owned bytes and supports a local Blob', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const { openDocument } = (window as any).documents,
      signal = new AbortController().signal;
    const bytes = new Uint8Array(await (await fetch('/fixtures/magazine.pdf')).arrayBuffer()),
      length = bytes.length;
    const p = await openDocument(
      { type: 'pdf', data: bytes },
      `${location.origin}/test-assets/`,
      signal,
    );
    p.dispose();
    const blob = new Blob([bytes], { type: 'application/pdf' });
    const b = await openDocument(
      { type: 'pdf', data: blob },
      `${location.origin}/test-assets/`,
      signal,
    );
    const count = b.pageCount;
    b.dispose();
    return { length: bytes.length, expected: length, count };
  });
  expect(result.length).toBe(result.expected);
  expect(result.count).toBe(6);
});

test('concurrent Blob and URL viewers keep their own worker asset directories', async ({
  page,
}) => {
  const requests: string[] = [];
  for (const directory of ['worker-a', 'worker-b']) {
    await page.route(`**/${directory}/**`, (route) => {
      const file = new URL(route.request().url()).pathname.split(`/${directory}/`)[1]!;
      if (file === 'pdf.worker.min.mjs') requests.push(directory);
      return route.fulfill({ path: resolve('dist/assets', file) });
    });
  }
  const counts = await page.evaluate(async () => {
    const { openDocument } = (window as any).documents;
    const bytes = await (await fetch('/fixtures/magazine.pdf')).arrayBuffer();
    let release!: () => void;
    let converting!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    const started = new Promise<void>((resolve) => (converting = resolve));
    class DelayedBlob extends Blob {
      async arrayBuffer() {
        converting();
        await gate;
        return super.arrayBuffer();
      }
    }
    const signal = new AbortController().signal;
    const first = openDocument(
      { type: 'pdf', data: new DelayedBlob([bytes]) },
      `${location.origin}/worker-a/`,
      signal,
    );
    await started;
    const second = await openDocument(
      { type: 'pdf', data: '/fixtures/magazine.pdf' },
      `${location.origin}/worker-b/`,
      signal,
    );
    release();
    const a = await first;
    const counts = [a.pageCount, second.pageCount];
    a.dispose();
    second.dispose();
    return counts;
  });
  expect(counts).toEqual([6, 6]);
  expect(requests.sort()).toEqual(['worker-a', 'worker-b']);
});
test('reports malformed PDFs and failed image URLs', async ({ page }) => {
  const errors = await page.evaluate(async () => {
    const { openDocument } = (window as any).documents,
      signal = new AbortController().signal;
    const errors = [];
    for (const source of [
      { type: 'pdf', data: '/fixtures/malformed.pdf' },
      { type: 'images', pages: [{ src: '/missing-image.png' }] },
    ]) {
      let p;
      try {
        p = await openDocument(source, `${location.origin}/test-assets/`, signal);
        await p.size(1, signal);
      } catch (e) {
        errors.push((e as Error).message);
      } finally {
        p?.dispose();
      }
    }
    return errors;
  });
  expect(errors[0]).toContain('PDF could not be opened');
  expect(errors[1]).toMatch(/Image|image/);
});
test('reports password requirements and missing PDF URLs', async ({ page, context }) => {
  await context.route('**/fixtures/missing.pdf', (route) =>
    route.fulfill({ status: 404, body: 'Not found' }),
  );
  const errors = await page.evaluate(async () => {
    const { openDocument } = (window as any).documents,
      errors = [];
    for (const file of ['password', 'missing']) {
      try {
        const p = await openDocument(
          { type: 'pdf', data: `/fixtures/${file}.pdf` },
          `${location.origin}/test-assets/`,
          new AbortController().signal,
        );
        p.dispose();
      } catch (e) {
        errors.push((e as Error).message);
      }
    }
    return errors;
  });
  expect(errors[0]).toContain('password');
  expect(errors[1]).toContain('PDF could not be opened');
});
