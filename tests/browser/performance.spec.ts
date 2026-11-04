import { test, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { cpus, platform, release, totalmem } from 'node:os';

test.describe('constrained device rendering', () => {
  test.use({ deviceScaleFactor: 3 });
  test('caps GPU pixel allocation and honors an explicit quality override', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'deviceMemory', { configurable: true, value: 2 });
      Object.defineProperty(navigator, 'hardwareConcurrency', { configurable: true, value: 4 });
    });
    await page.goto('/reader-probe.html');
    const results = await page.evaluate(async () => {
      const r = (window as any).reader;
      const mount = document.querySelector<HTMLElement>('#one')!;
      mount.style.width = '320px';
      const results = [];
      for (const options of [{}, { maxPixelRatio: 2, memoryBudgetMB: 48 }]) {
        const b = r.createFlipbook(mount, { source: r.images, renderer: 'webgl', ...options });
        await b.ready;
        results.push({
          ratio: b.renderer.element.width / b.ui.stage.clientWidth,
          budget: b.performance.memoryBudgetMB,
          bytes: b.scheduler.stats().bytes + b.scheduler.stats().reservedBytes,
        });
        b.destroy();
      }
      return results;
    });
    expect(results[0]!.ratio).toBeCloseTo(1.5, 2);
    expect(results[0]!.budget).toBe(32);
    expect(results[0]!.bytes).toBeLessThanOrEqual(32 * 1024 * 1024);
    expect(results[1]!.ratio).toBeCloseTo(2, 2);
    expect(results[1]!.budget).toBe(48);
  });
});

test('data-saving skips speculative downloads while page navigation still works', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'connection', {
      configurable: true,
      value: { saveData: true },
    });
  });
  const pages: string[] = [];
  page.on('request', (request) => {
    if (/samples\/page-\d\.svg$/.test(request.url())) pages.push(request.url().split('/').at(-1)!);
  });
  await page.goto('/reader-probe.html');
  await page.evaluate(async () => {
    const r = (window as any).reader;
    const b = r.createFlipbook(document.querySelector('#one'), {
      source: r.images,
      renderer: 'flat',
      pageMode: 'single',
    });
    (window as any).book = b;
    await b.ready;
  });
  expect([...new Set(pages)]).toEqual(['page-1.svg']);
  await page.getByRole('button', { name: 'Next page', exact: true }).click();
  await expect(page.getByRole('spinbutton', { name: 'Page number' })).toHaveValue('2');
  expect([...new Set(pages)]).toEqual(['page-1.svg', 'page-2.svg']);
});

test('fitted and immediate turns skip redundant transform and animation draws', async ({
  page,
}) => {
  await page.goto('/reader-probe.html');
  const result = await page.evaluate(async () => {
    const r = (window as any).reader;
    const b = r.createFlipbook(document.querySelector('#one'), {
      source: r.images,
      renderer: 'webgl',
      initialPage: 2,
      duration: 0,
    });
    await b.ready;
    let transforms = 0,
      turns = 0;
    const transform = b.renderer.setTransform.bind(b.renderer),
      turn = b.renderer.turn.bind(b.renderer);
    b.renderer.setTransform = (...args: any[]) => {
      transforms++;
      transform(...args);
    };
    b.renderer.turn = (...args: any[]) => {
      turns++;
      turn(...args);
    };
    b.resetZoom();
    b.next();
    await new Promise((resolve) => {
      const off = b.on('pagechange', () => {
        off();
        resolve(undefined);
      });
    });
    const result = { transforms, turns, page: b.getState().page };
    b.destroy();
    return result;
  });
  expect(result).toEqual({ transforms: 0, turns: 0, page: 4 });
});

test('records warmed page-turn timings on this hardware', async ({ page, browser }, info) => {
  test.skip(info.project.name !== 'chromium', 'One controlled desktop measurement');
  await page.goto('/reader-probe.html');
  await page.waitForFunction(() => !!(window as any).reader);
  const result = await page.evaluate(async () => {
    const r = (window as any).reader,
      b = r.createFlipbook(document.querySelector('#one'), {
        source: r.images,
        renderer: 'webgl',
        initialPage: 2,
        duration: 600,
      });
    await b.ready;
    const samples: number[] = [];
    async function turn(target: number, record = false) {
      b.goToPage(target);
      let previous = 0;
      await new Promise<void>((resolve) => {
        const sample = (time: number) => {
          if (previous && record) samples.push(time - previous);
          previous = time;
          if (b.getState().status === 'ready' && b.getState().page === target) resolve();
          else requestAnimationFrame(sample);
        };
        requestAnimationFrame(sample);
      });
    }
    await turn(4);
    await turn(2);
    for (let i = 0; i < 6; i++) await turn(i % 2 === 0 ? 4 : 2, true);
    const gl = (document.querySelector('.folio3d-canvas') as HTMLCanvasElement).getContext(
        'webgl2',
      )!,
      extension = gl.getExtension('WEBGL_debug_renderer_info');
    const gpu = extension
      ? gl.getParameter(extension.UNMASKED_RENDERER_WEBGL)
      : gl.getParameter(gl.RENDERER);
    const result = {
      samples,
      gpu,
      userAgent: navigator.userAgent,
      hardwareConcurrency: navigator.hardwareConcurrency,
      viewport: { width: innerWidth, height: innerHeight },
      devicePixelRatio,
      renderer: b.getState().renderer,
    };
    b.destroy();
    return result;
  });
  expect(result.samples.length).toBeGreaterThan(10);
  expect(result.samples.every(Number.isFinite)).toBe(true);
  const sorted = [...result.samples].sort((a, b) => a - b),
    percentile = (p: number) => sorted[Math.floor((sorted.length - 1) * p)]!;
  const report = {
    ...result,
    p50ms: percentile(0.5),
    p95ms: percentile(0.95),
    maxMs: sorted.at(-1),
    browser: browser.version(),
    node: process.version,
    host: {
      platform: platform(),
      release: release(),
      cpu: cpus()[0]?.model,
      ramGiB: Math.round(totalmem() / 1024 ** 3),
    },
    conditions: `Headless Chromium, 900x650 reader, six 600ms warmed turns, ${info.config.workers} test worker(s); no universal FPS claim.`,
  };
  await mkdir('artifacts', { recursive: true });
  await writeFile('artifacts/performance.json', JSON.stringify(report, null, 2));
  console.log(
    `Warmed turns: ${result.samples.length} frames; p50 ${report.p50ms.toFixed(2)}ms, p95 ${report.p95ms.toFixed(2)}ms; ${report.gpu}`,
  );
});
