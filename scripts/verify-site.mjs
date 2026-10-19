import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';

const base = new URL(process.argv[2] ?? 'https://folio3d.sujaysreedhar.com/');
if (!base.pathname.endsWith('/')) base.pathname += '/';
const label = base.hostname === '127.0.0.1' ? 'local' : 'live';
const browser = await chromium.launch();
const report = {
  url: base.href,
  version: '0.3.0',
  browser: browser.version(),
  checkedAt: new Date().toISOString(),
  profiles: [],
};
await mkdir('artifacts', { recursive: true });
try {
  for (const mobile of [false, true]) {
    const context = await browser.newContext({
      viewport: mobile ? { width: 390, height: 844 } : { width: 1200, height: 900 },
      reducedMotion: 'no-preference',
    });
    const page = await context.newPage(),
      failures = [];
    page.on('pageerror', (error) => failures.push(error.message));
    page.on('response', (response) => {
      if (response.status() >= 400 && !response.url().endsWith('/favicon.ico'))
        failures.push(`${response.status()} ${response.url()}`);
    });
    page.on('request', (request) => {
      if (request.method() !== 'GET')
        failures.push(`Unexpected ${request.method()} ${request.url()}`);
    });
    await page.goto(base.href, { waitUntil: 'networkidle' });
    assert.equal(
      await page.locator('meta[name="folio3d-version"]').getAttribute('content'),
      '0.3.0',
    );
    const ready = async (locator) => {
      await locator.waitFor();
      await page.waitForFunction(
        (selector) => document.querySelector(selector)?.getAttribute('data-status') === 'ready',
        await locator.evaluate((el) => (el.closest('dialog') ? 'dialog .folio3d' : '.folio3d')),
      );
    };
    await ready(page.locator('#book .folio3d'));
    assert.equal(await page.locator('#book .folio3d').getAttribute('data-renderer'), 'webgl');
    const picker = page.getByRole('combobox', { name: 'Theme', exact: true });
    assert.equal(await picker.locator('option').count(), 8);
    for (const theme of [
      'classic',
      'modern',
      'sepia',
      'midnight',
      'ocean',
      'forest',
      'slate',
      'high-contrast',
    ]) {
      await picker.selectOption(theme);
      assert.equal(await page.locator('#book .folio3d').getAttribute('data-theme'), theme);
      assert.ok((await page.locator('#snippet').textContent()).includes(`theme: '${theme}'`));
    }
    await page.getByRole('button', { name: 'Custom palette', exact: true }).click();
    await page.getByRole('button', { name: 'Sample PDF', exact: true }).click();
    await page.getByText('Sample PDF · 6 pages', { exact: true }).waitFor();
    await ready(page.locator('#book .folio3d'));
    const field = page.locator('#book input'),
      before = await field.inputValue();
    await page.locator('#book').getByRole('button', { name: 'Next page', exact: true }).click();
    await page.waitForFunction(
      (value) => document.querySelector('#book input')?.value !== value,
      before,
    );
    await ready(page.locator('#book .folio3d'));
    const selected = await field.inputValue();
    await page.getByRole('button', { name: 'Browse book' }).click();
    await page.waitForFunction(
      () => document.querySelectorAll('.folio3d-thumbnails canvas').length === 6,
    );
    await page.getByRole('button', { name: 'Close navigation' }).click();
    await page.getByRole('button', { name: 'Open lightbox' }).click();
    await ready(page.locator('dialog .folio3d'));
    assert.equal(await page.locator('dialog input').inputValue(), selected);
    assert.equal(
      await page.locator('dialog').evaluate((el) => getComputedStyle(el).backgroundColor),
      'rgb(241, 250, 251)',
    );
    await page.keyboard.press('Escape');
    await page.locator('dialog').waitFor({ state: 'detached' });
    await page.screenshot({
      path: `artifacts/${label}-${mobile ? 'mobile' : 'desktop'}.png`,
      fullPage: true,
    });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    for (const route of ['catalog', 'portfolio', 'bookshelf']) {
      await page.goto(new URL(`demos/${route}.html`, base).href);
      if (route === 'bookshelf')
        await page.getByRole('button', { name: 'Read Fieldnotes magazine', exact: true }).click();
      await ready(page.locator('.folio3d'));
    }
    assert.deepEqual(failures, []);
    report.profiles.push({
      profile: mobile ? 'mobile' : 'desktop',
      themes: 8,
      pdf: true,
      lightbox: true,
      thumbnails: true,
      routes: ['catalog', 'portfolio', 'bookshelf'],
      failures,
    });
    await context.close();
  }
  await writeFile(`artifacts/${label}-verification.json`, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
} finally {
  await browser.close();
}
