import { chromium } from '@playwright/test';
import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { resolve } from 'node:path';
import { spawn } from 'node:child_process';

const label = process.argv[2] ?? 'current';
const framesOnly = process.argv.includes('--frames-only');
const hardware = process.argv.includes('--hardware');
const libraryIndex = process.argv.indexOf('--library');
const library = libraryIndex < 0 ? 'dist' : process.argv[libraryIndex + 1];
if (!/^[a-z0-9-]+$/.test(label)) throw new Error('Use a simple benchmark label.');
const root = resolve('artifacts/benchmarks', label);
await mkdir(root, { recursive: true });
if (!process.argv.includes('--reuse')) await cp(library, `${root}/lib`, { recursive: true });
await cp('tests/fixtures/magazine.pdf', `${root}/sample.pdf`);
await cp('demo/public/samples', `${root}/samples`, { recursive: true });
await writeFile(
  `${root}/index.html`,
  `<!doctype html><html><head><link rel="stylesheet" href="./lib/folio3d.min.css"></head><body style="margin:0"><div id="book" style="height:650px;width:100%"></div></body></html>`,
);
const server = spawn(process.execPath, ['scripts/serve.mjs', '--root', root, '--port', '4188'], {
  stdio: 'pipe',
  windowsHide: true,
});
await new Promise((resolve, reject) => {
  server.stdout.once('data', resolve);
  server.once('error', reject);
  server.once('exit', (code) => reject(new Error(`Benchmark server exited: ${code}`)));
});
let browser;
try {
  browser = await chromium.launch(
    hardware ? { channel: 'chromium', args: ['--use-angle=d3d11'] } : {},
  );
} catch (error) {
  server.kill();
  throw error;
}
const runs = process.argv.includes('--trace') ? 1 : 10;
const median = (values) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
const report = {
  label,
  hardware,
  browser: browser.version(),
  runsPerCase: runs,
  cases: [],
  entryGzipBytes: gzipSync(await readFile(`${root}/lib/folio3d.min.js`)).length,
};
try {
  for (const profile of framesOnly ? [] : ['desktop', 'mobile'])
    for (const renderer of ['flat', 'webgl']) {
      const samples = [];
      for (let i = 0; i < runs; i++) {
        const context = await browser.newContext({
          viewport:
            profile === 'desktop' ? { width: 1200, height: 900 } : { width: 390, height: 844 },
          reducedMotion: 'no-preference',
        });
        const page = await context.newPage();
        if (profile === 'mobile') {
          const cdp = await context.newCDPSession(page);
          await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
        }
        await page.goto('http://127.0.0.1:4188/');
        samples.push(
          await page.evaluate(async (renderer) => {
            const start = performance.now();
            const { createFlipbook } = await import('./lib/folio3d.min.js');
            const b = createFlipbook(document.querySelector('#book'), {
              source: { type: 'pdf', data: './sample.pdf' },
              renderer,
              initialPage: 2,
              duration: 0,
            });
            await b.ready;
            const readyMs = performance.now() - start;
            const readyStats = b.scheduler.stats();
            await new Promise((resolve) => requestAnimationFrame(resolve));
            const beforeStats = b.scheduler.stats();
            const turnStart = performance.now();
            b.next();
            await new Promise((resolve) => {
              const off = b.on('pagechange', () => {
                off();
                resolve();
              });
            });
            const turnMs = performance.now() - turnStart;
            const actualRenderer = b.getState().renderer;
            const afterStats = b.scheduler.stats();
            b.destroy();
            return { readyMs, turnMs, actualRenderer, readyStats, beforeStats, afterStats };
          }, renderer),
        );
        await context.close();
      }
      report.cases.push({
        profile,
        renderer,
        readyMedianMs: median(samples.map((s) => s.readyMs)),
        turnMedianMs: median(samples.map((s) => s.turnMs)),
        samples,
      });
    }
  const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
  await page.goto('http://127.0.0.1:4188/');
  report.frames = await page.evaluate(async () => {
    const { createFlipbook } = await import('./lib/folio3d.min.js');
    const b = createFlipbook(document.querySelector('#book'), {
      source: {
        type: 'images',
        pages: Array.from({ length: 6 }, (_, i) => ({ src: `./samples/page-${i + 1}.svg` })),
      },
      renderer: 'webgl',
      initialPage: 2,
      duration: 600,
    });
    await b.ready;
    const samples = [];
    for (let i = 0; i < 8; i++) {
      b.goToPage(i % 2 ? 2 : 4);
      let last = 0;
      await new Promise((resolve) => {
        const frame = (time) => {
          if (last && i >= 2) samples.push(time - last);
          last = time;
          if (b.getState().status === 'ready') resolve();
          else requestAnimationFrame(frame);
        };
        requestAnimationFrame(frame);
      });
    }
    const gl = document.querySelector('canvas').getContext('webgl2');
    const extension = gl.getExtension('WEBGL_debug_renderer_info');
    const gpu = gl.getParameter(extension ? extension.UNMASKED_RENDERER_WEBGL : gl.RENDERER);
    b.destroy();
    samples.sort((a, b) => a - b);
    return {
      p50ms: samples[Math.floor(samples.length * 0.5)],
      p95ms: samples[Math.floor(samples.length * 0.95)],
      count: samples.length,
      gpu,
    };
  });
  await writeFile(
    `${root}/${framesOnly ? 'frames-report' : 'report'}.json`,
    JSON.stringify(report, null, 2),
  );
  console.log(
    JSON.stringify(
      {
        ...report,
        cases: report.cases.map(({ samples, ...rest }) =>
          process.argv.includes('--trace') ? { ...rest, samples } : rest,
        ),
      },
      null,
      2,
    ),
  );
} finally {
  await browser.close();
  server.kill();
}
