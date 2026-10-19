import { expect, test } from '@playwright/test';

const themes = [
  'classic',
  'modern',
  'sepia',
  'midnight',
  'ocean',
  'forest',
  'slate',
  'high-contrast',
];

test('lightbox font overrides style the header as well as reader controls', async ({ page }) => {
  await page.goto('/reader-probe.html');
  const fonts = await page.evaluate(async () => {
    const r = (window as any).reader;
    const b = r.openFlipbook({
      source: r.images,
      renderer: 'flat',
      themeOverrides: { font: 'monospace' },
    });
    await b.ready;
    const dialog = document.querySelector('dialog')!;
    const read = () =>
      [dialog, dialog.querySelector('.folio3d')!, dialog.querySelector('.folio3d-close')!].map(
        (el) => getComputedStyle(el).fontFamily,
      );
    const initial = read();
    b.setThemeOverrides({ font: 'Georgia' });
    const changed = read();
    b.destroy();
    return { initial, changed };
  });
  expect(fonts.initial).toEqual(['monospace', 'monospace', 'monospace']);
  expect(fonts.changed).toEqual(['Georgia', 'Georgia', 'Georgia']);
});

test('host inline CSS survives state updates and is restored after JavaScript overrides clear', async ({
  page,
}) => {
  await page.goto('/reader-probe.html');
  const colors = await page.evaluate(async () => {
    const r = (window as any).reader;
    const b = r.createFlipbook(document.querySelector('#one'), {
      source: r.images,
      renderer: 'flat',
    });
    await b.ready;
    const root = document.querySelector('#one .folio3d') as HTMLElement;
    const read = () => root.style.getPropertyValue('--folio-paper');
    root.style.setProperty('--folio-paper', '#ffffee');
    b.setSound(true);
    const untouched = read();
    b.setThemeOverrides({ paper: '#f1fafb' });
    const overridden = read();
    b.setThemeOverrides({});
    const restored = read();
    b.setThemeOverrides({ paper: '#f1fafb' });
    root.style.setProperty('--folio-paper', '#fafafa', 'important');
    b.setSound(false);
    const reapplied = read();
    b.setThemeOverrides({});
    const updatedHost = read(),
      priority = root.style.getPropertyPriority('--folio-paper');
    b.destroy();
    return { untouched, overridden, restored, reapplied, updatedHost, priority };
  });
  expect(colors).toEqual({
    untouched: '#ffffee',
    overridden: '#f1fafb',
    restored: '#ffffee',
    reapplied: '#f1fafb',
    updatedHost: '#fafafa',
    priority: 'important',
  });
});

test('demo exposes eight presets, updates embed examples and carries custom colors into lightboxes', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.locator('#book .folio3d')).toHaveAttribute('data-status', 'ready');
  const picker = page.getByRole('combobox', { name: 'Theme', exact: true });
  await expect(picker.locator('option')).toHaveCount(8);
  const currentPage = await page.locator('#book input').inputValue();
  for (const theme of themes.slice(4)) {
    await picker.selectOption(theme);
    await expect(page.locator('#book .folio3d')).toHaveAttribute('data-theme', theme);
    await expect(page.locator('#snippet')).toContainText(`theme: '${theme}'`);
  }
  await page.getByRole('button', { name: 'Custom palette', exact: true }).click();
  await expect(page.locator('#snippet')).toContainText('themeOverrides');
  await expect(page.locator('#book input')).toHaveValue(currentPage);
  await page.getByRole('button', { name: 'Open lightbox' }).click();
  await expect(page.getByRole('dialog')).toHaveCSS('background-color', 'rgb(241, 250, 251)');
  await expect(page.getByRole('dialog').locator('input')).toHaveValue(currentPage);
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Custom palette', exact: true }).click();
  await expect(page.locator('#book .folio3d')).toHaveCSS('background-color', 'rgb(20, 20, 20)');
});

test('all presets and custom overrides preserve pages and isolate readers and lightboxes', async ({
  page,
}) => {
  await page.goto('/reader-probe.html');
  const result = await page.evaluate(async (themes) => {
    const r = (window as any).reader;
    const overrides = { accent: '#005a7a', paper: '#f1fafb', font: 'Georgia, serif' };
    const b = r.createFlipbook(document.querySelector('#one'), {
      source: r.images,
      renderer: 'flat',
      initialPage: 2,
      themeOverrides: overrides,
    });
    const other = r.createFlipbook(document.querySelector('#two'), {
      source: r.images,
      renderer: 'flat',
    });
    await Promise.all([b.ready, other.ready]);
    overrides.paper = '#000';
    const events: any[] = [];
    b.on('themechange', (s: any) => events.push(s));
    for (const theme of themes) b.setTheme(theme);
    const root = document.querySelector('#one .folio3d') as HTMLElement;
    const snapshot = b.getState();
    snapshot.themeOverrides.paper = '#000';
    const preserved = {
      page: b.getState().page,
      paper: getComputedStyle(root).getPropertyValue('--folio-paper').trim(),
      other: other.getState().themeOverrides,
      stored: b.getState().themeOverrides,
    };
    b.setThemeOverrides({ accent: '#123456' });
    const replaced = b.getState().themeOverrides;
    b.setThemeOverrides({});
    const cleared = b.getState().themeOverrides;
    const modal = r.openFlipbook({
      source: { type: 'pdf', data: '/samples/magazine.pdf' },
      assetBaseUrl: '/lib/assets/',
      renderer: 'flat',
      theme: 'ocean',
      themeOverrides: { paper: '#f1fafb' },
    });
    await modal.ready;
    const pdfThemes = themes.map((theme: string) => {
      modal.setTheme(theme);
      return modal.getState().theme;
    });
    const dialog = document.querySelector('dialog')!;
    const modalInitial = getComputedStyle(dialog).getPropertyValue('--folio-paper').trim();
    modal.setTheme('forest');
    modal.setThemeOverrides({ paper: '#f5fff2' });
    const modalChanged = getComputedStyle(dialog).getPropertyValue('--folio-paper').trim();
    modal.destroy();
    b.destroy();
    other.destroy();
    return {
      preserved,
      replaced,
      cleared,
      eventCount: events.length,
      modalInitial,
      modalChanged,
      pdfThemes,
    };
  }, themes);
  expect(result.preserved).toEqual({
    page: 2,
    paper: '#f1fafb',
    other: {},
    stored: { accent: '#005a7a', paper: '#f1fafb', font: 'Georgia, serif' },
  });
  expect(result.replaced).toEqual({ accent: '#123456' });
  expect(result.cleared).toEqual({});
  expect(result.eventCount).toBe(9);
  expect(result.modalInitial).toBe('#f1fafb');
  expect(result.modalChanged).toBe('#f5fff2');
  expect(result.pdfThemes).toEqual(themes);
});

test('preset text and focus tokens meet contrast targets and host CSS survives override clearing', async ({
  page,
}) => {
  await page.goto('/reader-probe.html');
  const results = await page.evaluate(async (themes) => {
    const r = (window as any).reader;
    const b = r.createFlipbook(document.querySelector('#one'), {
      source: r.images,
      renderer: 'flat',
    });
    await b.ready;
    const root = document.querySelector('#one .folio3d') as HTMLElement;
    const lum = (hex: string) => {
      const rgb = hex
        .trim()
        .slice(1)
        .match(/../g)!
        .map((v) => parseInt(v, 16) / 255)
        .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
      return rgb[0]! * 0.2126 + rgb[1]! * 0.7152 + rgb[2]! * 0.0722;
    };
    const ratio = (a: string, b: string) =>
      (Math.max(lum(a), lum(b)) + 0.05) / (Math.min(lum(a), lum(b)) + 0.05);
    const values = themes.map((theme) => {
      b.setTheme(theme);
      const css = getComputedStyle(root),
        token = (name: string) => css.getPropertyValue(`--folio-${name}`);
      return {
        theme,
        text: ratio(token('ink'), token('paper')),
        muted: ratio(token('muted'), token('paper')),
        focus: Math.min(
          ratio(token('accent'), token('paper')),
          ratio(token('accent'), token('stage')),
        ),
      };
    });
    const style = document.createElement('style');
    style.textContent = '#one .folio3d { --folio-paper: #ffffee; }';
    document.head.append(style);
    b.setThemeOverrides({ paper: '#f1fafb' });
    b.setThemeOverrides({});
    const paper = getComputedStyle(root).getPropertyValue('--folio-paper').trim();
    b.destroy();
    return { values, paper };
  }, themes);
  for (const value of results.values) {
    expect(value.text, value.theme).toBeGreaterThanOrEqual(4.5);
    expect(value.muted, value.theme).toBeGreaterThanOrEqual(4.5);
    expect(value.focus, value.theme).toBeGreaterThanOrEqual(3);
  }
  expect(results.paper).toBe('#ffffee');
});
