import { test, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { cpus, platform, release, totalmem } from 'node:os';
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
