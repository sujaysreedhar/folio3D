import { chromium, firefox, webkit } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';

const results = [];
for (const [name, browserType] of Object.entries({ chromium, firefox, webkit })) {
  const browser = await browserType.launch({
    headless: true,
    ...(name === 'chromium' ? { channel: process.env.FOLIO_CHROMIUM_CHANNEL } : {}),
  });
  try {
    const page = await browser.newPage();
    const graphics = await page.evaluate(() => {
      const canvas = document.createElement('canvas');
      let error;
      canvas.addEventListener('webglcontextcreationerror', (event) => {
        error = event.statusMessage;
      });
      const gl = canvas.getContext('webgl2');
      if (!gl) return { webgl2: false, error };
      const extension = gl.getExtension('WEBGL_debug_renderer_info');
      const renderer = gl.getParameter(extension?.UNMASKED_RENDERER_WEBGL ?? gl.RENDERER);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return { webgl2: true, renderer };
    });
    const result = { browser: name, ...graphics };
    results.push(result);
    console.log(JSON.stringify(result));
  } finally {
    await browser.close();
  }
}
await mkdir('artifacts', { recursive: true });
await writeFile('artifacts/browser-environment.json', JSON.stringify(results, null, 2) + '\n');
if (results.some((result) => !result.webgl2)) {
  throw new Error(
    'Browser WebGL2 preflight failed. On Linux run through npm run test:browser so Xvfb is active.',
  );
}
