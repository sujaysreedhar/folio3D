import { chromium, firefox, webkit } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Linux graphics probes need a virtual display; Playwright installs Xvfb.
if (process.platform === 'linux' && !process.env.DISPLAY) {
  const child = spawnSync('xvfb-run', ['-a', process.execPath, fileURLToPath(import.meta.url)], { stdio: 'inherit' });
  if (child.error) throw child.error;
  process.exit(child.status ?? 1);
}

const results = [];
for (const [name, browserType] of Object.entries({ chromium, firefox, webkit })) {
  const variants = name === 'firefox'
    ? [
        { label: 'headless', headless: true },
        { label: 'headed', headless: false },
        { label: 'headed-forced', headless: false, firefoxUserPrefs: { 'webgl.force-enabled': true } },
      ]
    : [{ label: 'headless', headless: true }];
  for (const { label, ...options } of variants) {
    const browser = await browserType.launch(options);
    try {
      const page = await browser.newPage();
      await page.setContent('<button>Check audio</button>');
      const graphics = await page.evaluate(() => {
        const canvas = document.createElement('canvas');
        let error;
        canvas.addEventListener('webglcontextcreationerror', (event) => { error = event.statusMessage; });
        const gl = canvas.getContext('webgl2');
        if (!gl) return { webgl2: false, error };
        const extension = gl.getExtension('WEBGL_debug_renderer_info');
        const renderer = gl.getParameter(extension?.UNMASKED_RENDERER_WEBGL ?? gl.RENDERER);
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        return { webgl2: true, renderer };
      });
      await page.evaluate(() => {
        document.querySelector('button').onclick = () => {
          const context = new AudioContext();
          const resume = context.resume();
          window.audioCheck = Promise.race([
            resume.then(() => ({ state: context.state })),
            new Promise((resolve) => setTimeout(() => resolve({ state: context.state, timedOut: true }), 2000)),
          ]).then(async (result) => { await context.close(); return result; });
        };
      });
      await page.getByRole('button').click();
      const audio = await page.evaluate(() => window.audioCheck);
      const result = { browser: name, variant: label, ...graphics, audio };
      results.push(result);
      console.log(JSON.stringify(result));
    } finally {
      await browser.close();
    }
  }
}
await mkdir('artifacts', { recursive: true });
await writeFile('artifacts/browser-environment.json', JSON.stringify(results, null, 2) + '\n');
